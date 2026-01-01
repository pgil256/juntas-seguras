import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getUserModel } from "../../../../lib/db/models/user";
import connect from "../../../../lib/db/connect";
import { authOptions } from "../../../../app/api/auth/[...nextauth]/options";
import { logServerActivity } from "../../../../lib/utils";
import { ActivityType } from "../../../../types/security";

// GET /api/users/profile - Get current user profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    await connect();
    const UserModel = getUserModel();
    
    const user = await UserModel.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Return user profile data without sensitive information
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      avatar: user.avatar || '',
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// PUT /api/users/profile - Update user profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await req.json();
    
    // Only allow updating specific fields
    const { name, phone, avatar } = data;
    
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    
    await connect();
    const UserModel = getUserModel();
    
    const user = await UserModel.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Update the user profile
    const updatedUser = await UserModel.findOneAndUpdate(
      { email: session.user.email },
      { 
        name,
        phone,
        avatar
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      createdAt: updatedUser.createdAt,
      avatar: updatedUser.avatar || '',
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/profile - Partial update of user profile
export async function PATCH(req: NextRequest) {
  try {
    // Check for userId in query params (for signup flow) or use session auth
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const data = await req.json();
    
    await connect();
    const UserModel = getUserModel();
    
    let user;
    
    // If userId provided, use it directly (for setup flows)
    if (userId) {
      user = await UserModel.findOne({ id: userId });
    } else {
      // Otherwise, verify session auth
      const session = await getServerSession(authOptions);
      if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = await UserModel.findOne({ email: session.user.email });
    }
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Determine which fields to update
    const updateData: Record<string, any> = {};
    
    // Allow updating name, phone, avatar 
    if (data.name) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    
    // Allow updating MFA setup status
    if (data.mfaSetupComplete !== undefined) {
      updateData.mfaSetupComplete = data.mfaSetupComplete;
      
      // If MFA setup is complete, also mark as verified and not pending
      if (data.mfaSetupComplete === true) {
        // Using dot notation doesn't work well with Mongoose, using the $ operator instead
        updateData['twoFactorAuth.verified'] = true;
        updateData.pendingMfaVerification = false;
        
        // Ensure MFA is enabled
        updateData['twoFactorAuth.enabled'] = true;
        
        // Log activity for completing MFA setup
        try {
          logServerActivity(
            user.id, 
            ActivityType.TWO_FACTOR_SETUP,
            { method: user.twoFactorAuth?.method || 'unknown', completed: true }
          );
        } catch (error) {
          console.error('Failed to log MFA setup activity:', error);
        }
      }
    }
    
    // Update the user
    const updatedUser = await UserModel.findOneAndUpdate(
      userId ? { id: userId } : { email: user.email },
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      id: updatedUser.id,
      mfaSetupComplete: updatedUser.mfaSetupComplete,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}