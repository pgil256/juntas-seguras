import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getUserModel } from "../../../../lib/db/models/user";
import connect from "../../../../lib/db/connect";
import { authOptions } from "../../../../app/api/auth/[...nextauth]/options";

// GET /api/users/settings - Get user settings
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
    
    // Get user settings or return defaults
    return NextResponse.json({
      id: user.id,
      language: user.language || 'en',
      timezone: user.timezone || 'America/New_York',
      securitySettings: {
        twoFactorAuth: user.twoFactorAuth || false,
        lastPasswordChange: user.lastPasswordChange || user.createdAt
      },
      notificationPreferences: user.notificationPreferences || {
        email: {
          paymentReminders: true,
          poolUpdates: true,
          memberActivity: false,
          marketing: false
        },
        push: {
          paymentReminders: true,
          poolUpdates: true,
          memberActivity: true,
          marketing: false
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}

// PUT /api/users/settings - Update user settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await req.json();
    
    await connect();
    const UserModel = getUserModel();
    
    const user = await UserModel.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Update settings based on what was passed
    const updateData: any = {};
    
    if (data.language) updateData.language = data.language;
    if (data.timezone) updateData.timezone = data.timezone;
    if (data.notificationPreferences) updateData.notificationPreferences = data.notificationPreferences;
    
    // Update the user settings
    const updatedUser = await UserModel.findOneAndUpdate(
      { email: session.user.email },
      updateData,
      { new: true }
    );
    
    return NextResponse.json({
      id: updatedUser.id,
      language: updatedUser.language || 'en',
      timezone: updatedUser.timezone || 'America/New_York',
      notificationPreferences: updatedUser.notificationPreferences || {
        email: {
          paymentReminders: true,
          poolUpdates: true,
          memberActivity: false,
          marketing: false
        },
        push: {
          paymentReminders: true,
          poolUpdates: true,
          memberActivity: true,
          marketing: false
        }
      }
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Failed to update user settings" },
      { status: 500 }
    );
  }
}