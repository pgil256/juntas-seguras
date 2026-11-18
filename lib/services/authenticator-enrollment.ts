import qrcode from 'qrcode';
import speakeasy from 'speakeasy';
import { getUserModel, type UserDocument } from '../db/models/user';

export async function startAuthenticatorEnrollment(user: UserDocument, backupCodes?: string[]) {
  const secret = speakeasy.generateSecret({ name: `Juntas Seguras:${user.email}` });
  if (!secret.otpauth_url) throw new Error('Failed to generate authenticator setup');
  const qrCode = await qrcode.toDataURL(secret.otpauth_url);
  const result = await getUserModel().updateOne({ _id: user._id, isTemporary: { $ne: true } }, {
    $set: {
      'twoFactorAuth.pendingTotpSecret': secret.base32,
      'twoFactorAuth.pendingBackupCodes': backupCodes || [],
    },
  });
  if (!result.matchedCount) throw new Error('Account unavailable for enrollment');
  return { secret: secret.base32, qrCode };
}

export async function confirmAuthenticatorEnrollment(user: UserDocument, code: string) {
  const pending = user.twoFactorAuth?.pendingTotpSecret;
  if (!pending || !/^\d{6}$/.test(code) ||
      !speakeasy.totp.verify({ secret: pending, encoding: 'base32', token: code, window: 1 })) {
    return false;
  }

  const backupCodes = user.twoFactorAuth.pendingBackupCodes;
  const result = await getUserModel().updateOne({
    _id: user._id, isTemporary: { $ne: true }, 'twoFactorAuth.pendingTotpSecret': pending,
  }, {
    $set: {
      'twoFactorAuth.totpSecret': pending,
      'twoFactorAuth.method': 'app',
      'twoFactorAuth.enabled': true,
      'twoFactorAuth.verified': true,
      'twoFactorAuth.lastUpdated': new Date().toISOString(),
      ...(backupCodes?.length ? { 'twoFactorAuth.backupCodes': backupCodes } : {}),
      mfaSetupComplete: true,
    },
    $unset: {
      'twoFactorAuth.pendingTotpSecret': '', 'twoFactorAuth.pendingBackupCodes': '',
      'twoFactorAuth.temporaryCode': '', 'twoFactorAuth.codeGeneratedAt': '',
    },
  });
  return result.modifiedCount === 1;
}
