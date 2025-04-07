import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../app/api/auth/[...nextauth]/options';
import { getUserModel } from '../../../lib/db/models/user';
import connect from '../../../lib/db/connect';
import mongoose from 'mongoose';
import { Notification, NotificationPreference } from '../../../types/notification';

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
async function getUserNotifications(userId: string): Promise<Notification[]> {
  try {
    await connect();
    const db = mongoose.connection.db;
    const notificationsCollection = db.collection('notifications');
    
    const notifications = await notificationsCollection
      .find({ userId })
      .sort({ date: -1 })
      .toArray();
      
    return notifications;
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return [];
  }
}

// No need for in-memory storage, we're using MongoDB directly

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id || session.user.email;
    
    // Get real notifications from the database
    const userNotifications = await getUserNotifications(userId);
    
    // Get user preferences from user document
    await connect();
    const UserModel = getUserModel();
    const user = await UserModel.findOne({ 
      $or: [{ id: userId }, { email: userId }]
    });
    
    // Use user preferences or default if not found
    let userPreferences = user?.notificationPreferences || [...defaultPreferences];
    
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
    
    const userId = session.user.id || session.user.email;
    const { action, id, type, preferences } = await request.json();
    
    // Get user preferences from the database
    await connect();
    const UserModel = getUserModel();
    const user = await UserModel.findOne({ 
      $or: [{ _id: userId }, { email: userId }]
    });
    
    // Use user preferences or defaults
    let userPreferences = user?.notificationPreferences || [...defaultPreferences];
    
    switch (action) {
      case 'markAsRead':
        if (id) {
          // Update the notification in MongoDB
          await connect();
          const db = mongoose.connection.db;
          const notificationsCollection = db.collection('notifications');
          
          await notificationsCollection.updateOne(
            { id, userId },
            { $set: { read: true } }
          );
          
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'markAllAsRead':
        // Update all user's notifications in MongoDB
        await connect();
        const db = mongoose.connection.db;
        const notificationsCollection = db.collection('notifications');
        
        await notificationsCollection.updateMany(
          { userId, read: false },
          { $set: { read: true } }
        );
        
        return NextResponse.json({ success: true });
        
      case 'deleteNotification':
        if (id) {
          // Delete the notification from MongoDB
          await connect();
          const db = mongoose.connection.db;
          const notificationsCollection = db.collection('notifications');
          
          await notificationsCollection.deleteOne({ id: Number(id), userId });
          
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'togglePreference':
        if (id && type) {
          // Get current user and preferences
          await connect();
          const UserModel = getUserModel();
          const user = await UserModel.findOne({ 
            $or: [{ id: userId }, { email: userId }]
          });
          
          // Get existing preferences or defaults
          const currentPreferences = user?.notificationPreferences || [...defaultPreferences];
          
          // Find the preference
          const prefIndex = currentPreferences.findIndex(p => p.id === id);
          if (prefIndex !== -1) {
            // Toggle the value
            const currentValue = currentPreferences[prefIndex][type];
            currentPreferences[prefIndex][type] = !currentValue;
            
            // Save back to database
            await UserModel.findOneAndUpdate(
              { $or: [{ id: userId }, { email: userId }] },
              { notificationPreferences: currentPreferences }
            );
          }
          
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'savePreferences':
        if (preferences) {
          // Save preferences directly to the user document
          await connect();
          const UserModel = getUserModel();
          await UserModel.findOneAndUpdate(
            { $or: [{ id: userId }, { email: userId }] },
            { notificationPreferences: preferences }
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
    
    // Create new notification object
    const newNotification: Notification = {
      id: Date.now(), // Generate a unique ID
      ...notificationData,
      date: new Date().toISOString(),
      read: false,
      userId
    };
    
    // Insert into MongoDB
    await connect();
    const db = mongoose.connection.db;
    const notificationsCollection = db.collection('notifications');
    
    await notificationsCollection.insertOne(newNotification);
    
    return NextResponse.json({ success: true, notification: newNotification });
  } catch (error) {
    console.error('Error in notifications PUT:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}