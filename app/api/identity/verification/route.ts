import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/db/connect';
import getUserModel from '@/lib/db/models/user';
import { createIdentityVerification, getOrCreateCustomer } from '@/lib/stripe';
import { VerificationStatus, VerificationType, VerificationMethod } from '@/types/identity';

// POST /api/identity/verification - Start a new identity verification process
export async function POST(request: NextRequest) {
  try {
    const { userId, type, method } = await request.json();
    
    // Simple validation
    if (!userId || !type || !method) {
      return NextResponse.json(
        { error: 'User ID, verification type, and method are required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get user model
    const UserModel = getUserModel();
    
    // Find the user
    const user = await UserModel.findOne({ id: userId });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has a pending or submitted verification
    if (
      user.identityVerification && 
      (user.identityVerification.status === VerificationStatus.PENDING || 
       user.identityVerification.status === VerificationStatus.SUBMITTED)
    ) {
      return NextResponse.json(
        { error: 'User already has a pending verification' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    
    // Set up verification URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/profile/identity/verification-complete`;
    const successUrl = `${baseUrl}/profile/identity/verification-success`;
    const failureUrl = `${baseUrl}/profile/identity/verification-failure`;
    
    // Create new verification record
    const verificationId = uuidv4();
    
    // Initialize verification data
    const verificationData = {
      status: VerificationStatus.PENDING,
      type: type as VerificationType,
      method: method as VerificationMethod,
      lastUpdated: now
    };
    
    // If using Stripe Identity, create a verification session
    if (method === VerificationMethod.STRIPE_IDENTITY) {
      // Get or create Stripe customer
      if (!user.stripeCustomerId) {
        const customerResult = await getOrCreateCustomer(
          userId,
          user.email,
          user.name
        );
        
        if (!customerResult.success) {
          return NextResponse.json(
            { error: 'Failed to create Stripe customer' },
            { status: 500 }
          );
        }
        
        // Save customer ID
        user.stripeCustomerId = customerResult.customerId;
        await user.save();
      }
      
      // Create verification session with Stripe
      const verificationResult = await createIdentityVerification(
        user.stripeCustomerId,
        returnUrl,
        successUrl,
        failureUrl
      );
      
      if (!verificationResult.success) {
        return NextResponse.json(
          { error: verificationResult.error || 'Failed to create verification session' },
          { status: 500 }
        );
      }
      
      // Update verification data with Stripe info
      verificationData.stripeVerificationId = verificationResult.verificationId;
      verificationData.stripeVerificationUrl = verificationResult.url;
    }
    
    // Update user with verification data
    if (!user.identityVerification) {
      user.identityVerification = verificationData;
    } else {
      // Update existing verification data
      Object.assign(user.identityVerification, verificationData);
    }
    
    await user.save();
    
    // Return the verification data
    return NextResponse.json({
      success: true,
      verification: user.identityVerification,
      verificationUrl: user.identityVerification.stripeVerificationUrl,
      message: 'Identity verification process started'
    });
    
  } catch (error: any) {
    console.error('Error starting identity verification:', error);
    
    return NextResponse.json(
      { error: 'Failed to start identity verification process' },
      { status: 500 }
    );
  }
}

// GET /api/identity/verification - Get verification status for a user
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get user model
    const UserModel = getUserModel();
    
    // Find the user
    const user = await UserModel.findOne({ id: userId });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has verification data
    if (!user.identityVerification) {
      return NextResponse.json({
        success: true,
        status: VerificationStatus.PENDING,
        isVerified: false,
        message: 'User has not started identity verification'
      });
    }
    
    // If the verification is done through Stripe and is submitted, check the status
    if (
      user.identityVerification.method === VerificationMethod.STRIPE_IDENTITY &&
      user.identityVerification.status === VerificationStatus.SUBMITTED &&
      user.identityVerification.stripeVerificationId
    ) {
      // TODO: In production, implement a webhook handler for Stripe Identity verification
      // This is a simplified implementation for development purposes
      
      // For now, consider verification successful after a certain period
      const submittedAt = new Date(user.identityVerification.submittedAt || '');
      const now = new Date();
      const timeDiffMs = now.getTime() - submittedAt.getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
      
      // If it's been more than 24 hours, consider it verified (for development)
      if (timeDiffHours > 24) {
        user.identityVerification.status = VerificationStatus.VERIFIED;
        user.identityVerification.verifiedAt = now.toISOString();
        user.identityVerification.lastUpdated = now.toISOString();
        user.identityVerified = true;
        await user.save();
      }
    }
    
    return NextResponse.json({
      success: true,
      status: user.identityVerification.status,
      verification: user.identityVerification,
      isVerified: user.identityVerified
    });
    
  } catch (error: any) {
    console.error('Error getting identity verification status:', error);
    
    return NextResponse.json(
      { error: 'Failed to get identity verification status' },
      { status: 500 }
    );
  }
}

// POST /api/identity/verification/complete - Complete the verification process
export async function PATCH(request: NextRequest) {
  try {
    const { userId, status, verificationId } = await request.json();
    
    if (!userId || !status || !verificationId) {
      return NextResponse.json(
        { error: 'User ID, status, and verification ID are required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get user model
    const UserModel = getUserModel();
    
    // Find the user
    const user = await UserModel.findOne({ id: userId });
    
    if (!user || !user.identityVerification) {
      return NextResponse.json(
        { error: 'User or verification data not found' },
        { status: 404 }
      );
    }
    
    // Check if the verification matches
    if (user.identityVerification.stripeVerificationId !== verificationId) {
      return NextResponse.json(
        { error: 'Verification ID mismatch' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    
    // Update verification status
    if (status === 'verified') {
      user.identityVerification.status = VerificationStatus.VERIFIED;
      user.identityVerification.verifiedAt = now;
      user.identityVerified = true;
    } else if (status === 'rejected') {
      user.identityVerification.status = VerificationStatus.REJECTED;
      user.identityVerification.rejectedAt = now;
    } else {
      user.identityVerification.status = VerificationStatus.SUBMITTED;
      user.identityVerification.submittedAt = now;
    }
    
    user.identityVerification.lastUpdated = now;
    await user.save();
    
    return NextResponse.json({
      success: true,
      status: user.identityVerification.status,
      isVerified: user.identityVerified,
      message: `Identity verification ${user.identityVerification.status}`
    });
    
  } catch (error: any) {
    console.error('Error completing identity verification:', error);
    
    return NextResponse.json(
      { error: 'Failed to complete identity verification' },
      { status: 500 }
    );
  }
}