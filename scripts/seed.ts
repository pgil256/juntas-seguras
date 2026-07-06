/**
 * Demo data seed script.
 *
 * Creates a demo user plus a savings pool mid-cycle: five members, a full
 * round of confirmed contributions with a completed payout, and a second
 * round partway through collection — so `clone → env → seed → dev` yields a
 * populated, believable app.
 *
 * The demo user is MFA-exempt at sign-in *when* DEMO_ACCOUNT_EMAIL matches
 * (see app/api/auth/[...nextauth]/options.ts), so a reviewer can log in with
 * just email + password.
 *
 * Usage:   npm run seed
 * Safe to re-run: existing demo data is deleted and recreated (idempotent).
 */

import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Load env: .env.local first (local overrides), then .env (fallbacks).
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { User } from '../lib/db/models/user';
import { Pool } from '../lib/db/models/pool';
import {
  PoolStatus,
  PoolMemberRole,
  PoolMemberStatus,
  TransactionType,
} from '../types/pool';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DEMO_EMAIL = (process.env.DEMO_ACCOUNT_EMAIL || 'demo@juntas-seguras.app').toLowerCase();
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD || 'DemoPass123!';
const POOL_ID = 'demo-pool-0001';
const CONTRIBUTION = 20; // Pool schema caps contributionAmount at 1..20.
const MEMBER_COUNT = 5;
const POT = CONTRIBUTION * MEMBER_COUNT; // per-round payout
const CURRENT_ROUND = 2;
const TOTAL_ROUNDS = 5;

const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// The demo participants. Member 1 (Maria) already received the round-1 payout;
// the demo user is the round-2 recipient (currently collecting contributions).
const PEOPLE = [
  { name: 'Maria Lopez', email: 'maria.lopez@example.com', role: PoolMemberRole.MEMBER },
  { name: 'Demo User', email: DEMO_EMAIL, role: PoolMemberRole.CREATOR },
  { name: 'James Okonkwo', email: 'james.okonkwo@example.com', role: PoolMemberRole.MEMBER },
  { name: 'Aisha Rahman', email: 'aisha.rahman@example.com', role: PoolMemberRole.MEMBER },
  { name: 'Chen Wei', email: 'chen.wei@example.com', role: PoolMemberRole.MEMBER },
];

async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/juntas-app';
  console.log(`🔌 Connecting to MongoDB (${uri.replace(/\/\/[^@]*@/, '//***:***@')}) ...`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('✓ Connected');
}

async function clearExisting(emails: string[]) {
  await Pool.deleteMany({ id: POOL_ID });
  await User.deleteMany({ email: { $in: emails } });
  console.log('🧹 Cleared any previous demo data');
}

async function seed() {
  const emails = PEOPLE.map((p) => p.email);
  await clearExisting(emails);

  // 1) Create user accounts (demo user + members).
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = iso(new Date());

  const users = await Promise.all(
    PEOPLE.map((p) =>
      User.create({
        name: p.name,
        email: p.email,
        hashedPassword: hashed,
        provider: 'credentials',
        emailVerified: true,
        isVerified: true,
        verificationMethod: 'email',
        mfaSetupComplete: true,
        pendingMfaVerification: false,
        createdAt: new Date(),
        lastLogin: new Date(),
        pools: [POOL_ID],
        twoFactorAuth: {
          enabled: true,
          method: 'email',
          verified: true,
          lastUpdated: now,
        },
        payoutMethods: {
          venmo: `@${p.name.split(' ')[0].toLowerCase()}-js`,
          preferred: 'venmo',
          updatedAt: new Date(),
        },
      })
    )
  );
  console.log(`👤 Created ${users.length} users (demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD})`);

  const demoUser = users[1]; // "Demo User" (creator)

  // 2) Build embedded members.
  const members = PEOPLE.map((p, i) => {
    const receivedRound1 = i === 0; // Maria received round 1
    return {
      id: i + 1,
      userId: users[i]._id,
      name: p.name,
      email: p.email,
      joinDate: iso(daysAgo(70)),
      joinedDate: daysAgo(70),
      role: p.role,
      position: i + 1,
      status: PoolMemberStatus.ACTIVE,
      paymentsOnTime: receivedRound1 ? 2 : CURRENT_ROUND - 1,
      paymentsMissed: 0,
      missedPayments: 0,
      totalContributed: CONTRIBUTION * (CURRENT_ROUND - 1),
      payoutReceived: receivedRound1,
      hasReceivedPayout: receivedRound1,
      payoutDate: receivedRound1 ? iso(daysAgo(30)) : '',
      contributionAmount: CONTRIBUTION,
    };
  });

  // 3) Transaction history.
  let txId = 1;
  const transactions: any[] = [];

  // Round 1: everyone contributes, Maria receives the pot.
  for (const m of members) {
    transactions.push({
      id: txId++,
      type: TransactionType.CONTRIBUTION,
      amount: CONTRIBUTION,
      date: iso(daysAgo(35)),
      member: m.name,
      status: 'completed',
      round: 1,
    });
  }
  transactions.push({
    id: txId++,
    type: TransactionType.PAYOUT,
    amount: POT,
    date: iso(daysAgo(30)),
    member: 'Maria Lopez',
    status: 'completed',
    round: 1,
  });

  // Round 2 (current): three of the four non-recipients have paid so far.
  for (const m of members) {
    if (m.position === 2) continue; // recipient this round
    const paid = m.position === 1 || m.position === 3 || m.position === 4;
    if (paid) {
      transactions.push({
        id: txId++,
        type: TransactionType.CONTRIBUTION,
        amount: CONTRIBUTION,
        date: iso(daysAgo(3)),
        member: m.name,
        status: 'completed',
        round: 2,
      });
    }
  }

  // 4) Current-round manual payment tracking (round 2).
  const currentRoundPayments = members
    .filter((m) => m.position !== 2) // recipient doesn't pay themselves this round
    .map((m) => {
      const verified = m.position === 1 || m.position === 3;
      const confirmed = m.position === 4;
      return {
        memberId: m.id,
        memberName: m.name,
        memberEmail: m.email,
        amount: CONTRIBUTION,
        status: verified ? 'admin_verified' : confirmed ? 'member_confirmed' : 'pending',
        ...(verified && { adminVerifiedAt: daysAgo(2), adminVerifiedBy: demoUser._id }),
        ...(confirmed && { memberConfirmedAt: daysAgo(1), memberConfirmedVia: 'venmo' }),
        dueDate: daysFromNow(4),
        reminderCount: 0,
        createdAt: daysAgo(6),
        updatedAt: new Date(),
      };
    });

  // 5) Create the pool.
  await Pool.create({
    id: POOL_ID,
    name: 'Familia Savings Circle',
    description: 'A monthly savings pool among friends and family. Demo data — amounts are illustrative.',
    createdAt: iso(daysAgo(70)),
    creatorId: demoUser._id,
    status: PoolStatus.ACTIVE,
    totalAmount: POT,
    contributionAmount: CONTRIBUTION,
    frequency: 'monthly',
    startDate: daysAgo(65),
    currentRound: CURRENT_ROUND,
    currentCycle: 1,
    totalRounds: TOTAL_ROUNDS,
    totalCycles: 1,
    nextPayoutDate: iso(daysFromNow(7)),
    memberCount: MEMBER_COUNT,
    maxMembers: 10,
    members,
    transactions,
    messages: [
      { id: 1, author: 'Maria Lopez', content: 'Thank you all — received this round! 🙏', date: iso(daysAgo(30)) },
      { id: 2, author: 'Demo User', content: 'Round 2 is open, please send your contributions by the due date.', date: iso(daysAgo(6)) },
    ],
    allowedPaymentMethods: ['venmo', 'cashapp', 'paypal', 'zelle'],
    adminPaymentMethods: {
      venmo: '@demo-user-js',
      zelle: DEMO_EMAIL,
      preferred: 'venmo',
      updatedAt: new Date(),
    },
    currentRoundPayments,
    currentRoundPayoutStatus: 'pending_collection',
  });

  console.log(`🏦 Created pool "${POOL_ID}" — round ${CURRENT_ROUND}/${TOTAL_ROUNDS}, ${MEMBER_COUNT} members, ${transactions.length} transactions`);
}

async function main() {
  try {
    await connect();
    await seed();
    console.log('\n✅ Seed complete.');
    console.log(`   Sign in at /auth/signin with:  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
    console.log('   (Set DEMO_ACCOUNT_EMAIL in the environment to skip the MFA step for this account.)');
  } catch (err) {
    console.error('\n❌ Seed failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
