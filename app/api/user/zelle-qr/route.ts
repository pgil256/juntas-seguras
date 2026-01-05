/**
 * Zelle QR Code Upload API
 *
 * Handles uploading and decoding Zelle QR codes for user payout methods.
 * Supports both user-level and pool-level QR code storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import connectToDatabase from '../../../../lib/db/connect';
import { User } from '../../../../lib/db/models/user';
import { decodeQRFromBase64 } from '../../../../lib/payments/qr-decode';

/**
 * GET /api/user/zelle-qr
 * Get the current user's Zelle QR code data
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const zelleQR = user.payoutMethods?.zelleQR || null;

    return NextResponse.json({
      zelleQR,
      hasZelleQR: !!zelleQR?.token,
    });
  } catch (error) {
    console.error('Error fetching Zelle QR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Zelle QR code' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/zelle-qr
 * Upload and decode a Zelle QR code image
 *
 * Request body:
 * - imageDataUrl: Base64-encoded image data URL (e.g., "data:image/png;base64,...")
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageDataUrl } = body;

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Check image size (limit to ~5MB base64 which is ~3.75MB actual)
    if (imageDataUrl.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image is too large. Please upload an image smaller than 5MB.' },
        { status: 400 }
      );
    }

    // Decode the QR code
    const decodeResult = await decodeQRFromBase64(imageDataUrl);

    if (!decodeResult.success || !decodeResult.data) {
      return NextResponse.json(
        { error: decodeResult.error || 'Failed to decode QR code' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Store the decoded QR data
    const zelleQRData = {
      token: decodeResult.data.token,
      rawContent: decodeResult.data.rawContent,
      imageDataUrl: decodeResult.imageDataUrl, // Resized image for display
      uploadedAt: new Date(),
    };

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $set: {
          'payoutMethods.zelleQR': zelleQRData,
          'payoutMethods.updatedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      zelleQR: {
        token: decodeResult.data.token,
        rawContent: decodeResult.data.rawContent,
        imageDataUrl: decodeResult.imageDataUrl,
        uploadedAt: zelleQRData.uploadedAt.toISOString(),
      },
      message: 'Zelle QR code uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading Zelle QR:', error);
    return NextResponse.json(
      { error: 'Failed to upload Zelle QR code' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/zelle-qr
 * Remove the user's Zelle QR code
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $unset: { 'payoutMethods.zelleQR': 1 },
        $set: { 'payoutMethods.updatedAt': new Date() },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Zelle QR code removed successfully',
    });
  } catch (error) {
    console.error('Error removing Zelle QR:', error);
    return NextResponse.json(
      { error: 'Failed to remove Zelle QR code' },
      { status: 500 }
    );
  }
}
