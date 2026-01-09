/**
 * NextAuth.js Configuration
 *
 * This file handles authentication for both OAuth providers (Google, Azure AD)
 * and credentials-based authentication with optional MFA.
 *
 * IMPORTANT: Auth Flow Overview
 * =============================
 *
 * 1. OAuth Sign-in (Google/Azure AD):
 *    - User authenticates with OAuth provider
 *    - JWT callback receives the OAuth account info
 *    - We look up or create the user in MongoDB by email
 *    - We store the MongoDB _id (not OAuth provider ID) in the JWT token
 *    - Session callback passes this MongoDB _id to the client
 *
 * 2. Credentials Sign-in:
 *    - User submits email/password (and optional MFA code)
 *    - authorize() validates credentials and returns user with MongoDB _id
 *    - JWT callback stores the _id in the token
 *    - Session callback passes this _id to the client
 *
 * KEY REQUIREMENT: session.user.id must ALWAYS be a valid MongoDB ObjectId string
 * so that API routes can query the database with getServerSession().
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import * as bcrypt from 'bcryptjs';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import { v4 as uuidv4 } from 'uuid';
import { sendEmailVerificationCode, verifyEmailCode, verifyTotpCode } from '../../../../lib/services/mfa';

/**
 * Helper to validate MongoDB ObjectId format
 * MongoDB ObjectIds are 24 character hex strings
 */
function isValidMongoObjectId(id: string | undefined | null): boolean {
  if (!id) return false;
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Helper to find or create a user in MongoDB for OAuth sign-ins
 * Returns the MongoDB _id as a string, or null if operation fails
 */
async function findOrCreateOAuthUser(
  email: string,
  name: string | null | undefined,
  provider: string,
  providerId: string
): Promise<{ userId: string; isNewUser: boolean; mfaEnabled: boolean; mfaMethod?: string } | null> {
  try {
    await connectToDatabase();
    const UserModel = getUserModel();

    // First, try to find existing user by email
    let dbUser = await UserModel.findOne({ email: email.toLowerCase() });

    if (dbUser) {
      // Existing user found - update their OAuth info and last login
      console.log(`[OAuth] Found existing user: ${email}, MongoDB _id: ${dbUser._id.toString()}`);

      await UserModel.findByIdAndUpdate(dbUser._id, {
        $set: {
          lastLogin: new Date().toISOString(),
          emailVerified: true,
          // Update provider info if this was previously a credentials-only user
          ...((!dbUser.provider || dbUser.provider === 'credentials') && {
            provider: provider,
            providerId: providerId,
          })
        }
      });

      return {
        userId: dbUser._id.toString(),
        isNewUser: false,
        mfaEnabled: dbUser.twoFactorAuth?.enabled === true,
        mfaMethod: dbUser.twoFactorAuth?.method
      };
    }

    // No existing user - create a new one
    console.log(`[OAuth] Creating new user for: ${email}`);

    dbUser = await UserModel.create({
      email: email.toLowerCase(),
      name: name || email.split('@')[0], // Use email prefix if no name provided
      emailVerified: true,
      provider: provider,
      providerId: providerId,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      verificationMethod: 'email',
      pools: [],
      twoFactorAuth: {
        enabled: false, // New OAuth users start with MFA disabled
        method: 'email',
        verified: false,
        lastUpdated: new Date().toISOString(),
      },
    });

    console.log(`[OAuth] Created new user: ${email}, MongoDB _id: ${dbUser._id.toString()}`);

    return {
      userId: dbUser._id.toString(),
      isNewUser: true,
      mfaEnabled: false,
      mfaMethod: undefined
    };
  } catch (error) {
    console.error('[OAuth] Error in findOrCreateOAuthUser:', error);
    return null;
  }
}

// Authenticate user with secure password comparison
async function authenticateUser(email: string, password: string, mfaCode?: string) {
  // SECURITY: Only log non-sensitive authentication attempt info
  console.log(`[Auth] Login attempt for user, mfaCode provided: ${!!mfaCode}`);

  await connectToDatabase();
  const UserModel = getUserModel();
  let user = await UserModel.findOne({ email });

  if (!user) {
    console.log('[Auth] User not found');
    return null;
  }

  // If MFA code is provided, skip password check and verify MFA directly
  if (mfaCode && mfaCode !== 'undefined') {
    // SECURITY: Never log MFA codes
    console.log(`[Auth] MFA verification attempt for user`);
    const userObjectIdString = user._id.toString();
    const mfaValid = await verifyEmailCode(userObjectIdString, mfaCode);

    if (!mfaValid) {
      console.log('[Auth] MFA validation failed');
      return null; // Indicate MFA failure
    }

    console.log('[Auth] MFA validation successful');
    // Update last login time
    await UserModel.findByIdAndUpdate(userObjectIdString, { $set: { lastLogin: new Date().toISOString() } });
    
    // Return user details without requiresMfa flag
    return {
      id: userObjectIdString,
      name: user.name,
      email: user.email,
      // No requiresMfa here, verification is complete
    };
  }

  // --- Original Flow: No MFA code provided, check password first ---
  console.log('[Auth] Checking password');
  const hashedPassword = user.hashedPassword;
  if (!hashedPassword) {
    console.log('[Auth] User has no password set');
    return null;
  }

  const passwordIsValid = await bcrypt.compare(password, hashedPassword);
  if (!passwordIsValid) {
    console.log('[Auth] Password validation failed');
    return null;
  }

  console.log('[Auth] Password validation successful, checking MFA');

  // --- Check if MFA is actually enabled for this user ---
  // Only require MFA if the user has explicitly enabled it AND it's configured
  const mfaEnabled = user.twoFactorAuth?.enabled === true;
  
  if (!mfaEnabled) {
    // No MFA required, complete login
    console.log('[Auth] MFA not enabled, completing login');
    await UserModel.findByIdAndUpdate(user._id, { $set: { lastLogin: new Date().toISOString() } });
    
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      // No requiresMfa flag
    };
  }

  // --- Initiate MFA Flow (Send Code) ---
  console.log('[Auth] MFA is enabled, sending code');
  const userObjectIdString = user._id.toString();
  const codeSent = await sendEmailVerificationCode(userObjectIdString);
  if (!codeSent) {
    console.error('[Auth] Failed to send email verification code');
    return null; // Indicate code sending failure
  }

  // Return user details WITH requiresMfa flag
  console.log('[Auth] MFA code sent, requiring verification');
  return {
  id: userObjectIdString,
  name: user.name,
  email: user.email,
  requiresMfa: true,
  mfaMethod: 'email' as const
  };
}

// Validate MFA codes (temporary codes, recovery codes, or TOTP)
async function validateMfaCode(userId: string, code: string): Promise<boolean> {
  await connectToDatabase();
  const UserModel = getUserModel();
  
  const user = await UserModel.findOne({ id: userId });
  if (!user || !user.twoFactorAuth?.enabled) {
    return false;
  }
  
  // Check for temporary code from email verification
  if (user.twoFactorAuth.temporaryCode && code === user.twoFactorAuth.temporaryCode) {
    // Verify the code isn't expired (codes are valid for 10 minutes)
    const codeGeneratedAt = new Date(user.twoFactorAuth.codeGeneratedAt || 0);
    const now = new Date();
    const codeAgeInMinutes = (now.getTime() - codeGeneratedAt.getTime()) / (1000 * 60);
    
    if (codeAgeInMinutes <= 10) {
      // Clear the temporary code after successful use
      user.twoFactorAuth.temporaryCode = undefined;
      user.twoFactorAuth.codeGeneratedAt = undefined;
      await user.save();
      return true;
    }
  }
  
  // Check for recovery codes
  if (user.twoFactorAuth.backupCodes?.includes(code)) {
    // Remove the used recovery code
    user.twoFactorAuth.backupCodes = user.twoFactorAuth.backupCodes.filter(
      (backupCode: string) => backupCode !== code
    );
    await user.save();
    return true;
  }
  
  // For TOTP app authentication, use the verifyTotpCode service
  // which properly validates TOTP codes using speakeasy
  if (user.twoFactorAuth.method === 'app') {
    // SECURITY: Never bypass MFA verification - use proper TOTP validation
    // The actual TOTP verification is handled by verifyTotpCode() in lib/services/mfa.ts
    return false; // Return false here - TOTP should use the dedicated verification endpoint
  }
  
  return false;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    // Microsoft Azure AD OAuth Provider
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || 'common',
    }),
    // Email/Password Credentials Provider
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await authenticateUser(
          credentials.email,
          credentials.password,
          credentials.mfaCode
        );

        if (!user) {
          // If authenticateUser returns null (e.g., bad password, failed MFA send)
          console.log('authenticateUser returned null, throwing Invalid email or password error.');
          throw new Error("Invalid email or password");
        }

        // Directly return the user object.
        // If requiresMfa is true, the jwt/session callbacks will handle it.
        console.log('Authorize function returning user object:', JSON.stringify(user));
        return user;
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    /**
     * JWT Callback
     *
     * This is called whenever a JWT is created or updated.
     * CRITICAL: We must ensure token.id is ALWAYS a valid MongoDB ObjectId string.
     *
     * Scenarios:
     * 1. OAuth sign-in: Look up/create user in MongoDB, store MongoDB _id (NOT OAuth provider ID)
     * 2. Credentials sign-in: user.id already contains MongoDB _id from authorize()
     * 3. Session update: Refresh user data from database
     *
     * @param token - The JWT token being created/updated
     * @param user - The user object (only present on initial sign-in)
     * @param account - OAuth account info (only present on OAuth sign-in)
     * @param trigger - What triggered this callback ('signIn', 'signUp', 'update')
     */
    async jwt({ token, user, account, trigger }) {
      // ============================================================
      // OAUTH SIGN-IN HANDLING (Google, Azure AD)
      // ============================================================
      // When a user signs in via OAuth, we need to:
      // 1. Find or create the user in our MongoDB database
      // 2. Store the MongoDB _id in the token (NOT the OAuth provider's ID)
      // 3. Handle MFA if the user has it enabled
      if (account && (account.provider === 'google' || account.provider === 'azure-ad')) {
        console.log(`[JWT] OAuth sign-in detected for ${token.email} via ${account.provider}`);

        // Get email from token (provided by OAuth provider)
        const email = token.email;
        if (!email) {
          console.error('[JWT] OAuth sign-in failed: no email in token');
          return token;
        }

        // Find or create user in MongoDB
        const oauthResult = await findOrCreateOAuthUser(
          email,
          token.name as string | null,
          account.provider,
          account.providerAccountId
        );

        if (oauthResult) {
          // CRITICAL: Set the MongoDB _id as the token.id
          token.id = oauthResult.userId;
          console.log(`[JWT] OAuth user mapped to MongoDB _id: ${token.id}`);

          // Handle MFA for existing OAuth users who have enabled it
          if (!oauthResult.isNewUser && oauthResult.mfaEnabled) {
            const mfaMethod = oauthResult.mfaMethod || 'email';

            if (mfaMethod === 'email') {
              // Send MFA code via email
              const codeSent = await sendEmailVerificationCode(oauthResult.userId);
              if (codeSent) {
                token.requiresMfa = true;
                token.mfaMethod = 'email';
                console.log(`[JWT] MFA code sent for OAuth user: ${email}`);
              } else {
                console.error(`[JWT] Failed to send MFA code for OAuth user: ${email}`);
              }
            } else if (mfaMethod === 'app') {
              // TOTP/authenticator app - no code to send, user enters from app
              token.requiresMfa = true;
              token.mfaMethod = 'app';
              console.log(`[JWT] TOTP MFA required for OAuth user: ${email}`);
            }
          }
        } else {
          console.error(`[JWT] Failed to find/create OAuth user for: ${email}`);
          // Fallback: try to look up user by email one more time
          try {
            await connectToDatabase();
            const UserModel = getUserModel();
            const dbUser = await UserModel.findOne({ email: email.toLowerCase() });
            if (dbUser) {
              token.id = dbUser._id.toString();
              console.log(`[JWT] Fallback lookup successful, _id: ${token.id}`);
            }
          } catch (fallbackError) {
            console.error('[JWT] Fallback lookup also failed:', fallbackError);
          }
        }
      }

      // ============================================================
      // CREDENTIALS SIGN-IN HANDLING
      // ============================================================
      // For credentials sign-in, the user object is returned by authorize()
      // and already contains the MongoDB _id as user.id
      if (user) {
        // Prefer user.id (should be MongoDB _id from authorize function)
        if (user.id) {
          token.id = user.id;
          console.log(`[JWT] Credentials user, setting token.id: ${token.id}`);
        }

        // Also copy over other user properties
        token.name = user.name || token.name;
        token.email = user.email || token.email;
        token.lastLoginTime = new Date().toISOString();

        // Add MFA status to token if user requires it
        if ('requiresMfa' in user && user.requiresMfa) {
          token.requiresMfa = user.requiresMfa;
          token.mfaMethod = user.mfaMethod;
        }
      }

      // ============================================================
      // FINAL VALIDATION: Ensure token.id is a valid MongoDB ObjectId
      // ============================================================
      // If token.id is not a valid ObjectId, try to look up user by email
      if (!isValidMongoObjectId(token.id as string) && token.email) {
        console.log(`[JWT] Invalid ObjectId "${token.id}", looking up user by email: ${token.email}`);
        try {
          await connectToDatabase();
          const UserModel = getUserModel();
          const dbUser = await UserModel.findOne({ email: (token.email as string).toLowerCase() });

          if (dbUser) {
            token.id = dbUser._id.toString();
            console.log(`[JWT] Found user by email, corrected token.id to: ${token.id}`);
          } else {
            console.error(`[JWT] No user found with email: ${token.email}`);
          }
        } catch (error) {
          console.error('[JWT] Error looking up user by email:', error);
        }
      }

      // ============================================================
      // SESSION UPDATE HANDLING
      // ============================================================
      // When update() is called (e.g., after MFA verification), refresh from DB
      if (trigger === 'update' && token.id && isValidMongoObjectId(token.id as string)) {
        try {
          await connectToDatabase();
          const UserModel = getUserModel();

          const dbUser = await UserModel.findById(token.id);

          if (dbUser) {
            // Clear MFA requirement if no longer pending
            if (!dbUser.pendingMfaVerification) {
              token.requiresMfa = false;
              delete token.mfaMethod;
              console.log(`[JWT] Cleared MFA requirement for user: ${token.email}`);
            }
          }
        } catch (error) {
          console.error('[JWT] Error refreshing MFA status:', error);
        }
      }

      return token;
    },
    /**
     * Session Callback
     *
     * This is called whenever a session is checked (e.g., getServerSession, useSession).
     * The session object returned here is what API routes and client components receive.
     *
     * CRITICAL: session.user.id must be a valid MongoDB ObjectId string so that
     * API routes can use it to query the database.
     *
     * The JWT callback should have already ensured token.id is valid, but we have
     * a fallback here just in case (e.g., for tokens created before this fix).
     */
    async session({ session, token }) {
      if (token && session.user) {
        let userId = token.id as string;

        // Validate that userId is a proper MongoDB ObjectId
        const hasValidId = isValidMongoObjectId(userId);

        if (!hasValidId && token.email) {
          // This is a fallback for edge cases or legacy tokens
          // The JWT callback should normally handle this
          console.warn(`[Session] Invalid ObjectId "${userId}", attempting fallback lookup by email`);
          try {
            await connectToDatabase();
            const UserModel = getUserModel();
            const dbUser = await UserModel.findOne({ email: (token.email as string).toLowerCase() });

            if (dbUser) {
              userId = dbUser._id.toString();
              // Note: We can't actually update the token here, but log for debugging
              console.log(`[Session] Fallback successful, found MongoDB _id: ${userId}`);
            } else {
              console.error(`[Session] Fallback failed: no user found with email: ${token.email}`);
            }
          } catch (error) {
            console.error('[Session] Error in fallback lookup:', error);
          }
        }

        // Set the user ID in the session
        // This is what API routes will receive via getServerSession()
        session.user.id = userId;
        session.lastLoginTime = token.lastLoginTime as string;

        // Add MFA status to session so client can handle MFA flows
        if ('requiresMfa' in token) {
          session.requiresMfa = token.requiresMfa as boolean;
          session.mfaMethod = token.mfaMethod;
        }

        // Log for debugging (remove in production if too noisy)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Session] User session created: id=${session.user.id}, email=${session.user.email}`);
        }
      }
      return session;
    },
    // Fix redirect logic to be more reliable
    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect called with:', { url, baseUrl });

      // Always allow sign-in page to prevent redirect loops
      if (url.includes('/auth/signin')) {
        console.log('Allowing sign-in page access');
        return url;
      }
      
      // Allow MFA verification pages
      if (url.includes('/mfa/verify')) {
        console.log('Allowing MFA verification page', url);
        return url;
      }
      
      // For other MFA related paths that shouldn't be directly accessed
      if (url.includes('/auth/mfa') || 
          (url.includes('/verify') && !url.includes('/mfa/verify')) || 
          url.includes('/verification') ||
          url.includes('/two-factor')) {
        console.log('Redirecting from MFA-related page to proper MFA flow');
        return `${baseUrl}/mfa/verify`;
      }

      // For URLs starting with the base URL, use as-is
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // For relative URLs, prepend baseUrl
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // Default to dashboard
      return `${baseUrl}/dashboard`;
    }
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  // In production, these should be environment variables
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
  debug: process.env.NODE_ENV === 'development',
};