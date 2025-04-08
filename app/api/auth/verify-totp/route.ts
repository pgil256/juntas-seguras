import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/options';
import connectToDatabase from '@/lib/db/connect';
import getUserModel from '@/lib/db/models/user';
import { verifyTotpCode } from '@/lib/services/mfa';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    await connectToDatabase();
    const UserModel = getUserModel();

    // Verify the TOTP code
    const isValid = await verifyTotpCode(session.user.id, code);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Update user's 2FA settings
    const user = await UserModel.findOne({ id: session.user.id });
    if (user) {
      user.twoFactorAuth = {
        enabled: true,
        method: 'totp',
        totpSecret: user.twoFactorAuth?.totpSecret || null,
        temporaryCode: null,
        codeGeneratedAt: null
      };
      await user.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    return NextResponse.json(
      { error: 'An error occurred while verifying TOTP' },
      { status: 500 }
    );
  }
} 