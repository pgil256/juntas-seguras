import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import { isValidObjectId } from '../../../../lib/utils/objectId';

export async function POST(req: Request) {
  try {
    const { userId, code, email } = await req.json(); 

    if (!isValidObjectId(userId) || typeof code !== 'string' || !/^\d{6}$/.test(code) ||
        (email !== undefined && typeof email !== 'string')) {
      return NextResponse.json({ error: 'A user ID and six-digit verification code are required' }, { status: 400 });
    }

    await connectToDatabase();
    const now = new Date();
    const legacyCodeCutoff = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const user = await getUserModel().findOneAndUpdate(
      {
        _id: userId,
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        isTemporary: true,
        isVerified: { $ne: true },
        verificationMethod: 'email',
        $and: [
          { $or: [
            { verificationCode: code },
            { verificationCode: null, 'twoFactorAuth.temporaryCode': code },
          ] },
          { $or: [
            { verificationExpiry: { $gt: now } },
            { verificationExpiry: null, 'twoFactorAuth.codeGeneratedAt': { $gt: legacyCodeCutoff, $lte: now.toISOString() } },
          ] },
        ],
      },
      {
        $set: {
          isVerified: true, isTemporary: false, emailVerified: true,
          mfaSetupComplete: true, pendingMfaVerification: false,
          'twoFactorAuth.verified': true, 'twoFactorAuth.enabled': true, 'twoFactorAuth.method': 'email',
        },
        $unset: {
          verificationCode: '', verificationExpiry: '',
          'twoFactorAuth.temporaryCode': '', 'twoFactorAuth.codeGeneratedAt': '',
        },
      }
    );
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Account verified successfully' });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
} 
