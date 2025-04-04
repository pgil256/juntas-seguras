import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ActivityLog, ActivityType } from '@/types/security';

// In a real application, this would use a proper database
const activityLogs: ActivityLog[] = [];

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

    // Extract IP and location information (in a real app, this would use a proper IP lookup service)
    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';
    
    // Create the activity log entry
    const activityLog: ActivityLog = {
      id: uuidv4(),
      userId,
      type: type as ActivityType,
      timestamp: new Date().toISOString(),
      ipAddress,
      deviceInfo: parseUserAgent(userAgent),
      location: await mockGeoLocation(ipAddress),
      metadata,
    };

    // In a real app, this would save to a database
    activityLogs.unshift(activityLog); // Add to the beginning for chronological order
    
    // Keep logs manageable for this example
    if (activityLogs.length > 1000) {
      activityLogs.pop();
    }

    return NextResponse.json({
      success: true,
      id: activityLog.id
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
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Filter logs by user ID and optionally by type
    let filteredLogs = activityLogs.filter(log => log.userId === userId);
    
    if (type) {
      filteredLogs = filteredLogs.filter(log => log.type === type);
    }

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const totalItems = filteredLogs.length;
    const totalPages = Math.ceil(totalItems / limit);
    
    // Get the paginated logs
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return NextResponse.json({
      logs: paginatedLogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Activity log fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve activity logs' },
      { status: 500 }
    );
  }
}

// Helper functions
function parseUserAgent(userAgent: string) {
  // In a real app, this would use a proper user agent parsing library
  const deviceInfo: { browser?: string; os?: string; device?: string } = {};
  
  // Very simplified browser detection
  if (userAgent.includes('Firefox')) {
    deviceInfo.browser = 'Firefox';
  } else if (userAgent.includes('Chrome')) {
    deviceInfo.browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    deviceInfo.browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    deviceInfo.browser = 'Edge';
  } else {
    deviceInfo.browser = 'Unknown';
  }
  
  // Very simplified OS detection
  if (userAgent.includes('Windows')) {
    deviceInfo.os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    deviceInfo.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    deviceInfo.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    deviceInfo.os = 'Android';
  } else if (userAgent.includes('iOS')) {
    deviceInfo.os = 'iOS';
  } else {
    deviceInfo.os = 'Unknown';
  }
  
  // Very simplified device detection
  if (userAgent.includes('Mobile')) {
    deviceInfo.device = 'Mobile';
  } else if (userAgent.includes('Tablet')) {
    deviceInfo.device = 'Tablet';
  } else {
    deviceInfo.device = 'Desktop';
  }
  
  return deviceInfo;
}

async function mockGeoLocation(ipAddress: string) {
  // In a real app, this would use a proper IP geolocation service
  // For mock purposes, return random locations
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
  const countries = ['United States', 'Canada', 'Mexico', 'United Kingdom', 'Germany'];
  
  return {
    city: cities[Math.floor(Math.random() * cities.length)],
    country: countries[Math.floor(Math.random() * countries.length)]
  };
}