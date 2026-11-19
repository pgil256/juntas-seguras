import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/db/connect';
import { getUserModel } from '../../../../../lib/db/models/user';
import { generateVerificationCode } from '../../../../../lib/utils/verification';
import { sendVerificationEmail } from '../../../../../lib/email';

import { isValidObjectId } from '../../../../../lib/utils/objectId';

export async function POST(req: Request) {
  try {
    const { userId, email, verificationMethod } = await req.json();

    if (!isValidObjectId(userId) || typeof email !== 'string' || !['email', 'app'].includes(verificationMethod)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const verificationCode = generateVerificationCode();
    const now = new Date();
    const user = await getUserModel().findOneAndUpdate(
      { _id: userId, email: email.trim().toLowerCase(), isTemporary: true, isVerified: { $ne: true } },
      { $set: {
        verificationCode,
        verificationExpiry: new Date(now.getTime() + 10 * 60 * 1000),
        verificationMethod: 'email',
        'twoFactorAuth.method': 'email',
        'twoFactorAuth.temporaryCode': verificationCode,
        'twoFactorAuth.codeGeneratedAt': now.toISOString(),
      } }
    );
    if (!user) {
      return NextResponse.json({ error: 'Pending registration not found' }, { status: 404 });
    }

    await sendVerificationEmail(user.email, verificationCode);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification code' },
      { status: 500 }
    );
  }
} 
