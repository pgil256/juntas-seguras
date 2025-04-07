import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/db/connect';
import getAuditLogModel from '@/lib/db/models/auditLog';
import getUserModel from '@/lib/db/models/user';
import { AuditLogType } from '@/types/audit';

// POST /api/audit/log - Create a new audit log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, action, metadata, poolId, success, errorMessage } = body;
    
    // Validate required fields
    if (!userId || !type || !action) {
      return NextResponse.json(
        { error: 'User ID, type, and action are required' },
        { status: 400 }
      );
    }
    
    // Validate audit log type
    if (!Object.values(AuditLogType).includes(type as AuditLogType)) {
      return NextResponse.json(
        { error: 'Invalid audit log type' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get models
    const AuditLogModel = getAuditLogModel();
    const UserModel = getUserModel();
    
    // Get the user for additional context
    const user = await UserModel.findOne({ id: userId });
    const userEmail = user ? user.email : undefined;
    
    // Get request information
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Create the audit log entry
    const auditLog = await AuditLogModel.create({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userId,
      userEmail,
      type,
      action,
      ip,
      userAgent,
      metadata: metadata || {},
      poolId,
      success: success !== undefined ? success : true,
      errorMessage,
    });
    
    return NextResponse.json({
      success: true,
      log: auditLog,
    });
    
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    
    return NextResponse.json(
      { error: 'Failed to create audit log entry' },
      { status: 500 }
    );
  }
}

// GET /api/audit/log - Query audit logs
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const poolId = searchParams.get('poolId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Build query object
    const query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (poolId) {
      query.poolId = poolId;
    }
    
    if (type) {
      // Handle multiple types (comma-separated)
      const types = type.split(',');
      if (types.length > 1) {
        query.type = { $in: types };
      } else {
        query.type = type;
      }
    }
    
    // Date range filtering
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        query.timestamp.$gte = startDate;
      }
      
      if (endDate) {
        query.timestamp.$lte = endDate;
      }
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get model
    const AuditLogModel = getAuditLogModel();
    
    // Count total matching documents for pagination
    const total = await AuditLogModel.countDocuments(query);
    
    // Execute query with pagination
    const logs = await AuditLogModel.find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit);
    
    return NextResponse.json({
      success: true,
      logs,
      total,
    });
    
  } catch (error: any) {
    console.error('Error querying audit logs:', error);
    
    return NextResponse.json(
      { error: 'Failed to query audit logs' },
      { status: 500 }
    );
  }
}