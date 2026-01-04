import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getUserModel } from "../../../../lib/db/models/user";
import connect from "../../../../lib/db/connect";
import { authOptions } from "../../../../app/api/auth/[...nextauth]/options";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const userAny = user as unknown as Record<string, unknown>;
    return NextResponse.json({
      id: user.id,
      language: userAny.language || 'en',
      timezone: userAny.timezone || 'America/New_York',
      securitySettings: {
        twoFactorAuth: user.twoFactorAuth || false,
        lastPasswordChange: userAny.lastPasswordChange || user.createdAt
      },
      notificationPreferences: userAny.notificationPreferences || {
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
    
    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
    const updatedAny = updatedUser as unknown as Record<string, unknown>;
    return NextResponse.json({
      id: updatedUser.id,
      language: updatedAny.language || 'en',
      timezone: updatedAny.timezone || 'America/New_York',
      notificationPreferences: updatedAny.notificationPreferences || {
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