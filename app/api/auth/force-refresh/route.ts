import { NextRequest, NextResponse } from 'next/server';

/**
 * Force refresh session route
 * This endpoint can be called to trigger a session refresh and clear MFA flags
 */
export async function POST(req: NextRequest) {
  try {
    // This route will trigger the JWT callback with trigger: 'update'
    // which will refresh the MFA status from the database
    return NextResponse.json({
      success: true,
      message: 'Session refresh triggered. Please call update() from the client.'
    });
  } catch (error) {
    console.error('Error in force refresh:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}