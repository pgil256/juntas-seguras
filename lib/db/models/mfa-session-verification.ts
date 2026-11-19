import mongoose, { Schema } from 'mongoose';

// A completed sign-in challenge can refresh only the session which initiated it.
const schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  expiresAt: { type: Date, expires: 0, required: true },
});

const Verification = mongoose.models.MfaSessionVerification || mongoose.model('MfaSessionVerification', schema);

export async function recordMfaVerification(challengeId: string, userId: string) {
  await Verification.updateOne({ _id: challengeId, userId }, {
    $set: { expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  }, { upsert: true });
}

export async function hasMfaVerification(challengeId: string, userId: string) {
  return Boolean(await Verification.exists({ _id: challengeId, userId, expiresAt: { $gt: new Date() } }));
}
