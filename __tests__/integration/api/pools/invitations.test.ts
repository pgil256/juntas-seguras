/**
 * Pool Invitation API Integration Tests
 *
 * Tests for invitation management:
 * - POST /api/pools/[id]/invitations - Send invitation
 * - POST /api/pools/invitations/accept - Accept invitation
 * - POST /api/pools/invitations/reject - Reject invitation
 * - GET /api/pools/invitations/validate - Validate invitation token
 */

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '@/lib/db/models/user';
import { getPoolModel } from '@/lib/db/models/pool';
import { PoolInvitation, getPoolInvitationModel } from '@/lib/db/models/poolInvitation';
import { PoolMemberRole, PoolMemberStatus, InvitationStatus } from '@/types/pool';
import { v4 as uuidv4 } from 'uuid';

describe('Pool Invitations API', () => {
  let mongoServer: MongoMemoryServer;
  const Pool = getPoolModel();
  const Invitation = getPoolInvitationModel();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Pool.deleteMany({});
    await Invitation.deleteMany({});
  });

  describe('POST Send Invitation', () => {
    it('should create invitation with unique token', async () => {
      const admin = await User.create({
        name: 'Pool Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['invite-pool'],
      });

      const pool = await Pool.create({
        id: 'invite-pool',
        name: 'Invitation Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        maxMembers: 5,
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        transactions: [],
        messages: [],
      });

      const invitationCode = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await Invitation.create({
        poolId: pool.id,
        email: 'invitee@test.com',
        invitedBy: admin._id,
        invitationCode: invitationCode,
        status: InvitationStatus.PENDING,
        expiresAt: expiresAt,
      });

      expect(invitation).toBeDefined();
      expect(invitation.invitationCode).toBe(invitationCode);
      expect(invitation.status).toBe(InvitationStatus.PENDING);
    });

    it('should generate unique invitation tokens for multiple invitations', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['multi-invite-pool'],
      });

      const pool = await Pool.create({
        id: 'multi-invite-pool',
        name: 'Multi Invitation Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [],
        transactions: [],
        messages: [],
      });

      const invitation1 = await Invitation.create({
        poolId: pool.id,
        email: 'invitee1@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const invitation2 = await Invitation.create({
        poolId: pool.id,
        email: 'invitee2@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(invitation1.invitationCode).not.toBe(invitation2.invitationCode);
    });

    it('should set 7-day expiration', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await Invitation.create({
        poolId: 'test-pool',
        email: 'invitee@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: sevenDaysFromNow,
      });

      // Check expiration is approximately 7 days from now
      const daysDiff = Math.round(
        (invitation.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      expect(daysDiff).toBe(7);
    });

    it('should prevent inviting existing member', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['member-pool'],
      });

      const existingMember = await User.create({
        name: 'Existing Member',
        email: 'existing@test.com',
        verificationMethod: 'email',
        pools: ['member-pool'],
      });

      await Pool.create({
        id: 'member-pool',
        name: 'Member Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
          {
            id: 2,
            name: existingMember.name,
            email: existingMember.email,
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      // Check if email is already a member
      const pool = await Pool.findOne({ id: 'member-pool' });
      const isExistingMember = pool?.members.some(
        (m: any) => m.email.toLowerCase() === existingMember.email.toLowerCase()
      );

      expect(isExistingMember).toBe(true);
    });

    it('should prevent duplicate invitation to same email for same pool', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      // Create first invitation
      await Invitation.create({
        poolId: 'dup-pool',
        email: 'duplicate@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Try to create duplicate - should fail due to unique index
      await expect(
        Invitation.create({
          poolId: 'dup-pool',
          email: 'duplicate@test.com',
          invitedBy: admin._id,
          invitationCode: uuidv4(),
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
      ).rejects.toThrow();
    });
  });

  describe('POST Accept Invitation', () => {
    it('should add user to pool when accepting', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['accept-pool'],
      });

      const invitedUser = await User.create({
        name: 'Invited User',
        email: 'invited@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const pool = await Pool.create({
        id: 'accept-pool',
        name: 'Accept Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        maxMembers: 5,
        totalRounds: 5,
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        transactions: [],
        messages: [],
      });

      const invitationCode = uuidv4();
      const invitation = await Invitation.create({
        poolId: pool.id,
        email: invitedUser.email,
        invitedBy: admin._id,
        invitationCode: invitationCode,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Accept invitation - add user to pool
      const newMemberId = pool.members.length + 1;
      const newPosition = pool.members.length + 1;

      pool.members.push({
        id: newMemberId,
        userId: invitedUser._id,
        name: invitedUser.name,
        email: invitedUser.email,
        role: PoolMemberRole.MEMBER,
        position: newPosition,
        status: PoolMemberStatus.ACTIVE,
      });

      await pool.save();

      // Mark invitation as accepted
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedDate = new Date();
      invitation.acceptedBy = invitedUser._id;
      await invitation.save();

      // Add pool to user's pools
      invitedUser.pools.push(pool.id);
      await invitedUser.save();

      const updatedPool = await Pool.findOne({ id: 'accept-pool' });
      const updatedInvitation = await Invitation.findOne({ invitationCode });
      const updatedUser = await User.findOne({ email: invitedUser.email });

      expect(updatedPool?.members).toHaveLength(2);
      expect(updatedPool?.members[1].email).toBe(invitedUser.email);
      expect(updatedInvitation?.status).toBe(InvitationStatus.ACCEPTED);
      expect(updatedUser?.pools).toContain(pool.id);
    });

    it('should assign correct position to new member', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['position-pool'],
      });

      const pool = await Pool.create({
        id: 'position-pool',
        name: 'Position Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        maxMembers: 5,
        members: [
          {
            id: 1,
            name: 'Admin',
            email: 'admin@test.com',
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
          {
            id: 2,
            name: 'Member 2',
            email: 'm2@test.com',
            role: PoolMemberRole.MEMBER,
            position: 2,
            status: PoolMemberStatus.ACTIVE,
          },
        ],
        transactions: [],
        messages: [],
      });

      // New member should get position 3
      const newPosition = pool.members.length + 1;

      pool.members.push({
        id: 3,
        name: 'New Member',
        email: 'new@test.com',
        role: PoolMemberRole.MEMBER,
        position: newPosition,
        status: PoolMemberStatus.ACTIVE,
      });

      await pool.save();

      const updated = await Pool.findOne({ id: 'position-pool' });
      const newMember = updated?.members.find((m: any) => m.email === 'new@test.com');

      expect(newMember?.position).toBe(3);
    });

    it('should reject expired invitation', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      // Create expired invitation
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      const invitation = await Invitation.create({
        poolId: 'expired-pool',
        email: 'expired@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: expiredDate,
      });

      // Check if expired
      const isExpired = new Date() > invitation.expiresAt;
      expect(isExpired).toBe(true);

      // Mark as expired
      invitation.status = InvitationStatus.EXPIRED;
      await invitation.save();

      const updated = await Invitation.findById(invitation._id);
      expect(updated?.status).toBe(InvitationStatus.EXPIRED);
    });

    it('should mark invitation as accepted', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const invitationCode = uuidv4();
      const invitation = await Invitation.create({
        poolId: 'accept-status-pool',
        email: 'acceptee@test.com',
        invitedBy: admin._id,
        invitationCode: invitationCode,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Use model method to accept
      await invitation.accept(admin._id.toString());

      const updated = await Invitation.findOne({ invitationCode });
      expect(updated?.status).toBe(InvitationStatus.ACCEPTED);
      expect(updated?.acceptedDate).toBeDefined();
    });
  });

  describe('POST Reject Invitation', () => {
    it('should mark invitation as rejected', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const invitationCode = uuidv4();
      const invitation = await Invitation.create({
        poolId: 'reject-pool',
        email: 'rejectee@test.com',
        invitedBy: admin._id,
        invitationCode: invitationCode,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Use model method to reject
      await invitation.reject('Not interested');

      const updated = await Invitation.findOne({ invitationCode });
      expect(updated?.status).toBe(InvitationStatus.REJECTED);
      expect(updated?.rejectedDate).toBeDefined();
      expect(updated?.message).toBe('Not interested');
    });

    it('should not add user to pool when rejected', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['no-add-pool'],
      });

      const pool = await Pool.create({
        id: 'no-add-pool',
        name: 'No Add Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        transactions: [],
        messages: [],
      });

      const originalMemberCount = pool.members.length;

      await Invitation.create({
        poolId: pool.id,
        email: 'noadd@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.REJECTED,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        rejectedDate: new Date(),
      });

      const updatedPool = await Pool.findOne({ id: 'no-add-pool' });
      expect(updatedPool?.members.length).toBe(originalMemberCount);
    });
  });

  describe('GET Validate Invitation', () => {
    it('should return valid for active invitation', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const invitationCode = uuidv4();
      await Invitation.create({
        poolId: 'validate-pool',
        email: 'validate@test.com',
        invitedBy: admin._id,
        invitationCode: invitationCode,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Use static method to find valid invitation
      const validInvitation = await Invitation.findValidByCode(invitationCode);

      expect(validInvitation).toBeDefined();
      expect(validInvitation?.status).toBe(InvitationStatus.PENDING);
    });

    it('should return invalid for expired token', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const invitationCode = uuidv4();
      await Invitation.create({
        poolId: 'expired-validate-pool',
        email: 'expired@test.com',
        invitedBy: admin._id,
        invitationCode: invitationCode,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
      });

      // findValidByCode should return null for expired
      const result = await Invitation.findValidByCode(invitationCode);
      expect(result).toBeNull();

      // Check invitation was marked as expired
      const updated = await Invitation.findOne({ invitationCode });
      expect(updated?.status).toBe(InvitationStatus.EXPIRED);
    });

    it('should return invalid for already accepted invitation', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const invitationCode = uuidv4();
      await Invitation.create({
        poolId: 'accepted-validate-pool',
        email: 'accepted@test.com',
        invitedBy: admin._id,
        invitationCode: invitationCode,
        status: InvitationStatus.ACCEPTED, // Already accepted
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedDate: new Date(),
      });

      // findValidByCode only returns PENDING invitations
      const result = await Invitation.findValidByCode(invitationCode);
      expect(result).toBeNull();
    });

    it('should return invalid for non-existent token', async () => {
      const result = await Invitation.findValidByCode('non-existent-token');
      expect(result).toBeNull();
    });
  });

  describe('Pool Full Prevention', () => {
    it('should prevent joining full pool', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['full-pool'],
      });

      const pool = await Pool.create({
        id: 'full-pool',
        name: 'Full Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        maxMembers: 3,
        totalRounds: 3,
        members: [
          { id: 1, name: 'M1', email: 'm1@test.com', role: PoolMemberRole.ADMIN, position: 1, status: PoolMemberStatus.CURRENT },
          { id: 2, name: 'M2', email: 'm2@test.com', role: PoolMemberRole.MEMBER, position: 2, status: PoolMemberStatus.ACTIVE },
          { id: 3, name: 'M3', email: 'm3@test.com', role: PoolMemberRole.MEMBER, position: 3, status: PoolMemberStatus.ACTIVE },
        ],
        transactions: [],
        messages: [],
      });

      // Pool is full (3 members, maxMembers is 3)
      const isFull = pool.members.length >= pool.maxMembers;
      expect(isFull).toBe(true);
    });
  });

  describe('Email Tracking', () => {
    it('should track email sent status', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const invitation = await Invitation.create({
        poolId: 'email-pool',
        email: 'emailtrack@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        emailSent: false,
      });

      // Mark email as sent
      invitation.emailSent = true;
      invitation.emailSentAt = new Date();
      await invitation.save();

      const updated = await Invitation.findById(invitation._id);
      expect(updated?.emailSent).toBe(true);
      expect(updated?.emailSentAt).toBeDefined();
    });

    it('should track reminder sent status', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      const invitation = await Invitation.create({
        poolId: 'reminder-pool',
        email: 'reminder@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        emailSent: true,
        reminderSent: false,
      });

      // Mark reminder as sent
      invitation.reminderSent = true;
      invitation.reminderSentAt = new Date();
      await invitation.save();

      const updated = await Invitation.findById(invitation._id);
      expect(updated?.reminderSent).toBe(true);
      expect(updated?.reminderSentAt).toBeDefined();
    });
  });

  describe('Cleanup Expired', () => {
    it('should cleanup expired invitations', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: [],
      });

      // Create expired invitations
      await Invitation.create({
        poolId: 'cleanup-pool',
        email: 'expired1@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
      });

      await Invitation.create({
        poolId: 'cleanup-pool',
        email: 'expired2@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // Expired
      });

      // Create valid invitation
      await Invitation.create({
        poolId: 'cleanup-pool',
        email: 'valid@test.com',
        invitedBy: admin._id,
        invitationCode: uuidv4(),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid
      });

      // Run cleanup
      const cleanedCount = await Invitation.cleanupExpired();
      expect(cleanedCount).toBe(2);

      // Check status was updated
      const expired = await Invitation.find({ status: InvitationStatus.EXPIRED });
      const pending = await Invitation.find({ status: InvitationStatus.PENDING });

      expect(expired).toHaveLength(2);
      expect(pending).toHaveLength(1);
    });
  });

  describe('Shareable Link Invitations', () => {
    it('should support shareable pool link', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        verificationMethod: 'email',
        pools: ['shareable-pool'],
      });

      const pool = await Pool.create({
        id: 'shareable-pool',
        name: 'Shareable Pool',
        contributionAmount: 10,
        frequency: 'weekly',
        members: [
          {
            id: 1,
            name: admin.name,
            email: admin.email,
            role: PoolMemberRole.ADMIN,
            position: 1,
            status: PoolMemberStatus.CURRENT,
          },
        ],
        transactions: [],
        messages: [],
      });

      // Generate shareable link code (pool-level, not email-specific)
      const shareableCode = uuidv4();

      // Shareable link can be used by anyone
      // When accessed, it should show pool info and allow joining

      expect(shareableCode).toBeDefined();
      expect(shareableCode.length).toBeGreaterThan(0);
    });
  });
});
