import { NextRequest, NextResponse } from 'next/server';
import { ActivityType } from '../../../../types/security';
import { logServerActivity, getActivityLogs } from '../../../../lib/utils';
import { getCurrentUser } from '../../../../lib/auth';

function getAdminEmails(): Set<string> {
  const configuredEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  if (process.env.EMAIL_USER) {
    configuredEmails.push(process.env.EMAIL_USER.trim().toLowerCase());
  }

  return new Set(configuredEmails);
}

function isActivityAdmin(email?: string | null): boolean {
  return !!email && getAdminEmails().has(email.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }

    const body = await request.json();
    const { type, metadata = {} } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Activity type is required' },
        { status: 400 }
      );
    }

    // Validate activity type
    if (!Object.values(ActivityType).includes(type as ActivityType)) {
      return NextResponse.json(
        { error: 'Invalid activity type' },
        { status: 400 }
      );
    }

    // Extract IP and location information
    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';
    
    // Add these to metadata
    const enhancedMetadata = {
      ...metadata,
      ipAddress,
      userAgent
    };

    // Log the activity using the server utility
    const activityLog = logServerActivity(userResult.user._id.toString(), type as ActivityType, enhancedMetadata);

    return NextResponse.json({
      success: true,
      id: activityLog?.id
    });
  } catch (error) {
    console.error('Activity log error:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') as ActivityType | undefined;
    const currentUserId = userResult.user._id.toString();
    const userId = isActivityAdmin(userResult.user.email) && requestedUserId
      ? requestedUserId
      : currentUserId;

    // Get logs using the utility function
    const result = getActivityLogs(userId, page, limit, type);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Activity log fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve activity logs' },
      { status: 500 }
    );
  }
}
