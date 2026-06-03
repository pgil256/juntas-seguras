import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '../../../app/api/auth/[...nextauth]/options';
import { getUserModel } from '../../../lib/db/models/user';
import connect from '../../../lib/db/connect';
import mongoose from 'mongoose';
import { Notification, NotificationPreference } from '../../../types/notification';
import { isValidObjectId } from '../../../lib/utils/objectId';

// Default notification preferences
const defaultPreferences: NotificationPreference[] = [
  {
    id: "email_payment",
    label: "Payment Reminders",
    description: "Get notified before payments are due",
    email: true,
    push: true,
  },
  {
    id: "email_transaction",
    label: "Transactions",
    description: "When members make deposits or receive payouts",
    email: true,
    push: true,
  },
  {
    id: "email_pool",
    label: "Pool Updates",
    description: "Changes to pool status or information",
    email: false,
    push: true,
  },
  {
    id: "email_invite",
    label: "New Invitations",
    description: "When you're invited to join a pool",
    email: true,
    push: true,
  },
  {
    id: "email_missed",
    label: "Missed Payments",
    description: "When a member misses a scheduled payment",
    email: true,
    push: true,
  },
];

// Get real notifications from the database
function getNotificationOwnerIds(session: Session): string[] {
  const values = [
    session.user?.id,
    session.user?.email,
    session.user?.email?.toLowerCase(),
  ].filter((value): value is string => !!value);

  return Array.from(new Set(values));
}

function getUserLookup(userId?: string | null, email?: string | null) {
  const conditions: Record<string, string>[] = [];

  if (isValidObjectId(userId)) {
    conditions.push({ _id: userId! });
  }

  if (email) {
    conditions.push({ email: email.toLowerCase() });
  }

  return conditions.length > 0 ? { $or: conditions } : { email: '__missing_user__' };
}

function normalizeNotificationId(id: unknown): number | string {
  const numericId = Number(id);
  return Number.isFinite(numericId) ? numericId : String(id);
}

async function getUserNotifications(ownerIds: string[]): Promise<Notification[]> {
  try {
    if (ownerIds.length === 0) return [];
    const db = mongoose.connection.db;
    if (!db) return [];
    const notificationsCollection = db.collection('notifications');

    const notifications = await notificationsCollection
      .find({ userId: { $in: ownerIds } })
      .sort({ date: -1 })
      .toArray();

    return notifications as unknown as Notification[];
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const ownerIds = getNotificationOwnerIds(session);
    
    // Connect to database
    await connect();
    
    // Get real notifications from the database
    const userNotifications = await getUserNotifications(ownerIds);
    
    // Get user preferences from user document
    const UserModel = getUserModel();
    const user = await UserModel.findOne(getUserLookup(session.user.id, session.user.email));
    
    // Use user preferences or default if not found
    const userPreferences = (user as unknown as { notificationPreferences?: NotificationPreference[] })?.notificationPreferences || [...defaultPreferences];
    
    return NextResponse.json({ 
      notifications: userNotifications, 
      unreadCount: userNotifications.filter(n => !n.read).length,
      preferences: userPreferences
    });
  } catch (error) {
    console.error('Error in notifications GET:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const ownerIds = getNotificationOwnerIds(session);
    const { action, id, type, preferences } = await request.json();
    
    // Connect to database
    await connect();
    
    switch (action) {
      case 'markAsRead':
        if (id) {
          // Update the notification in MongoDB
          const db1 = mongoose.connection.db;
          if (!db1) throw new Error('Database not connected');
          const notificationsCollection = db1.collection('notifications');
          
          await notificationsCollection.updateOne(
            { id: normalizeNotificationId(id), userId: { $in: ownerIds } },
            { $set: { read: true } }
          );
          
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'markAllAsRead': {
        // Update all user's notifications in MongoDB
        const db2 = mongoose.connection.db;
        if (!db2) throw new Error('Database not connected');
        const notificationsCollection2 = db2.collection('notifications');
        
        await notificationsCollection2.updateMany(
          { userId: { $in: ownerIds }, read: false },
          { $set: { read: true } }
        );

        return NextResponse.json({ success: true });
      }

      case 'deleteNotification':
        if (id) {
          // Delete the notification from MongoDB
          const db3 = mongoose.connection.db;
          if (!db3) throw new Error('Database not connected');
          const notificationsCollection3 = db3.collection('notifications');
          
          await notificationsCollection3.deleteOne({
            id: normalizeNotificationId(id),
            userId: { $in: ownerIds },
          });
          
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'togglePreference':
        if (id && type) {
          // Get current user and preferences
          const UserModel2 = getUserModel();
          const user2 = await UserModel2.findOne(getUserLookup(session.user.id, session.user.email));

          // Get existing preferences or defaults
          const currentPreferences = (user2 as unknown as { notificationPreferences?: NotificationPreference[] })?.notificationPreferences || [...defaultPreferences];

          // Find the preference
          const prefIndex = currentPreferences.findIndex((p: NotificationPreference) => p.id === id);
          if (prefIndex !== -1) {
            // Toggle the value
            const pref = currentPreferences[prefIndex] as unknown as Record<string, boolean>;
            const currentValue = pref[type];
            pref[type] = !currentValue;

            // Save back to database
            await UserModel2.findOneAndUpdate(
              getUserLookup(session.user.id, session.user.email),
              { $set: { notificationPreferences: currentPreferences } }
            );
          }
          
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'savePreferences':
        if (preferences) {
          // Save preferences directly to the user document
          const UserModel3 = getUserModel();
          await UserModel3.findOneAndUpdate(
            getUserLookup(session.user.id, session.user.email),
            { $set: { notificationPreferences: preferences } }
          );

          return NextResponse.json({ success: true });
        }
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error in notifications POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

// To create a new notification (for testing purposes)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id || session.user.email;
    const notificationData = await request.json();
    
    // Connect to database
    await connect();
    
    // Create new notification object
    const newNotification: Notification = {
      id: Date.now(), // Generate a unique ID
      ...notificationData,
      date: new Date().toISOString(),
      read: false,
      userId
    };
    
    // Insert into MongoDB
    const db4 = mongoose.connection.db;
    if (!db4) throw new Error('Database not connected');
    const notificationsCollection4 = db4.collection('notifications');
    
    await notificationsCollection4.insertOne(newNotification);
    
    return NextResponse.json({ success: true, notification: newNotification });
  } catch (error) {
    console.error('Error in notifications PUT:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
