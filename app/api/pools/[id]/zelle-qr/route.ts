/**
 * Pool-level Zelle QR Code Upload API
 *
 * Handles uploading and decoding Zelle QR codes for pool admin payment methods.
 * Only pool admins/creators can upload QR codes for the pool.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { Pool } from '../../../../../lib/db/models/pool';
import { PoolMemberRole } from '../../../../../types/pool';
import { decodeQRFromBase64 } from '../../../../../lib/payments/qr-decode';
import { getCurrentUser } from '../../../../../lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pools/[id]/zelle-qr
 * Get the pool's admin Zelle QR code data
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const { id } = await params;

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const zelleQR = pool.adminPaymentMethods?.zelleQR || null;

    return NextResponse.json({
      zelleQR,
      hasZelleQR: !!zelleQR?.token,
    });
  } catch (error) {
    console.error('Error fetching pool Zelle QR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Zelle QR code' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[id]/zelle-qr
 * Upload and decode a Zelle QR code image for the pool's admin payment methods
 * Only pool admin/creator can upload
 *
 * Request body:
 * - imageDataUrl: Base64-encoded image data URL (e.g., "data:image/png;base64,...")
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const { id } = await params;
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

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const isAdmin =
      member.role === PoolMemberRole.ADMIN ||
      member.role === PoolMemberRole.CREATOR;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only pool admin can upload Zelle QR codes' },
        { status: 403 }
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

    // Store the decoded QR data
    const zelleQRData = {
      token: decodeResult.data.token,
      rawContent: decodeResult.data.rawContent,
      imageDataUrl: decodeResult.imageDataUrl, // Resized image for display
      uploadedAt: new Date(),
    };

    const updatedPool = await Pool.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      {
        $set: {
          'adminPaymentMethods.zelleQR': zelleQRData,
          'adminPaymentMethods.updatedAt': new Date(),
        },
      },
      { new: true }
    );

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
    console.error('Error uploading pool Zelle QR:', error);
    return NextResponse.json(
      { error: 'Failed to upload Zelle QR code' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pools/[id]/zelle-qr
 * Remove the pool's admin Zelle QR code
 * Only pool admin/creator can delete
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    // Get current user with proper validation
    const userResult = await getCurrentUser();
    if (userResult.error) {
      return NextResponse.json(
        { error: userResult.error.message },
        { status: userResult.error.status }
      );
    }
    const user = userResult.user;

    const { id } = await params;

    await connectToDatabase();

    const pool = await Pool.findOne({
      $or: [{ id }, { _id: id }],
    });

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }

    // SECURITY: Check membership using userId (primary) with email fallback
    const userEmailLower = user.email?.toLowerCase();
    const member = pool.members.find(
      (m: any) => m.userId?.toString() === user._id.toString() || m.email?.toLowerCase() === userEmailLower
    );

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 });
    }

    const isAdmin =
      member.role === PoolMemberRole.ADMIN ||
      member.role === PoolMemberRole.CREATOR;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only pool admin can remove Zelle QR codes' },
        { status: 403 }
      );
    }

    await Pool.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      {
        $unset: { 'adminPaymentMethods.zelleQR': 1 },
        $set: { 'adminPaymentMethods.updatedAt': new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Zelle QR code removed successfully',
    });
  } catch (error) {
    console.error('Error removing pool Zelle QR:', error);
    return NextResponse.json(
      { error: 'Failed to remove Zelle QR code' },
      { status: 500 }
    );
  }
}
