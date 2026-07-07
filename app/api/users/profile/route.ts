import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { getUserModel } from "../../../../lib/db/models/user";

// GET /api/users/profile - Get current user profile
export async function GET(req: NextRequest) {
  try {
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    // Return user profile data without sensitive information
    return NextResponse.json({
      id: user._id.toString(),
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
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const data = await req.json();

    // Only allow updating specific fields
    const { name, phone, avatar } = data;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const UserModel = getUserModel();

    // Update the user profile
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: user._id },
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
      id: updatedUser._id.toString(),
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
    const data = await req.json();

    if (data.mfaSetupComplete !== undefined) {
      return NextResponse.json(
        { error: "MFA setup must be completed through a verification endpoint" },
        { status: 400 }
      );
    }

    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const UserModel = getUserModel();

    // Determine which fields to update
    const updateData: Record<string, any> = {};

    // Allow updating name, phone, avatar
    if (data.name) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

    // Update the user
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: user._id },
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      id: updatedUser._id.toString(),
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
