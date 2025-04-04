import { NextRequest, NextResponse } from 'next/server';
import { Notification, NotificationPreference } from '@/types/notification';

// Sample notification data (in a real app, this would come from a database)
let notifications: Notification[] = [
  {
    id: 1,
    message: "Your next payment for Family Savings Pool is due tomorrow",
    type: "payment",
    date: "2025-03-08T00:00:00Z",
    read: false,
    isImportant: true,
  },
  {
    id: 2,
    message: "Maria Rodriguez made a deposit of $50",
    type: "transaction",
    date: "2025-03-07T15:30:00Z",
    read: false,
    isImportant: false,
  },
  {
    id: 3,
    message: "Carlos Mendez has received the payout of $400",
    type: "transaction",
    date: "2025-03-07T10:45:00Z",
    read: false,
    isImportant: false,
  },
  {
    id: 4,
    message: "Pool cycle #4 has started",
    type: "pool",
    date: "2025-03-05T08:00:00Z",
    read: true,
    isImportant: false,
  },
  {
    id: 5,
    message: "Sofia Torres missed a payment. Reminder sent.",
    type: "alert",
    date: "2025-03-04T16:20:00Z",
    read: true,
    isImportant: true,
  },
  {
    id: 6,
    message: "You've been invited to join Vacation Fund pool",
    type: "invite",
    date: "2025-03-02T09:15:00Z",
    read: true,
    isImportant: false,
  },
  {
    id: 7,
    message: "Your account has been successfully verified",
    type: "system",
    date: "2025-02-28T14:30:00Z",
    read: true,
    isImportant: false,
  },
  {
    id: 8,
    message: "Family Savings Pool: Next payout is scheduled for March 15",
    type: "pool",
    date: "2025-02-25T11:45:00Z",
    read: true,
    isImportant: false,
  },
];

// Sample notification preferences (in a real app, this would come from a database)
let preferences: NotificationPreference[] = [
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

export async function GET() {
  try {
    return NextResponse.json({ 
      notifications, 
      unreadCount: notifications.filter(n => !n.read).length,
      preferences
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, id, type } = await request.json();
    
    switch (action) {
      case 'markAsRead':
        if (id) {
          notifications = notifications.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          );
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'markAllAsRead':
        notifications = notifications.map(notification => ({ ...notification, read: true }));
        return NextResponse.json({ success: true });
        
      case 'deleteNotification':
        if (id) {
          notifications = notifications.filter(notification => notification.id !== id);
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'togglePreference':
        if (id && type) {
          preferences = preferences.map(pref =>
            pref.id === id ? { ...pref, [type]: !pref[type] } : pref
          );
          return NextResponse.json({ success: true });
        }
        break;
        
      case 'savePreferences':
        // In a real app, this would save to a database
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

// To create a new notification (for testing purposes)
export async function PUT(request: NextRequest) {
  try {
    const notification = await request.json();
    const newNotification: Notification = {
      id: Date.now(), // Generate a unique ID
      ...notification,
      date: new Date().toISOString(),
      read: false
    };
    
    notifications.unshift(newNotification);
    return NextResponse.json({ success: true, notification: newNotification });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}