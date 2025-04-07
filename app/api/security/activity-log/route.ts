import { NextRequest, NextResponse } from 'next/server';
import { ActivityType } from '../../../../types/security';
import { logServerActivity, getActivityLogs } from '../../../../lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, metadata = {} } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'User ID and activity type are required' },
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
    const activityLog = logServerActivity(userId, type as ActivityType, enhancedMetadata);

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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') as ActivityType | undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

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