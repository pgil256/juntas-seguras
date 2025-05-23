import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from 'bcryptjs';
import connectToDatabase from '../../../../lib/db/connect';
import { getUserModel } from '../../../../lib/db/models/user';
import { v4 as uuidv4 } from 'uuid';
import { sendEmailVerificationCode, verifyEmailCode, verifyTotpCode } from '../../../../lib/services/mfa';

// Authenticate user with secure password comparison
async function authenticateUser(email: string, password: string, mfaCode?: string) {
  console.log(`authenticateUser called. email: ${email}, mfaCode provided: ${!!mfaCode}`);

  await connectToDatabase();
  const UserModel = getUserModel();
  let user = await UserModel.findOne({ email });

  if (!user) {
    console.log('User not found:', email);
    return null;
  }

  // If MFA code is provided, skip password check and verify MFA directly
  if (mfaCode && mfaCode !== 'undefined') {
    console.log(`Proceeding directly to MFA verification for ${email} with code: ${mfaCode}`);
    const userObjectIdString = user._id.toString();
    const mfaValid = await verifyEmailCode(userObjectIdString, mfaCode);

    if (!mfaValid) {
      console.log('MFA validation failed for code:', mfaCode);
      return null; // Indicate MFA failure
    }

    console.log('MFA validation successful');
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
  console.log(`Checking password for ${email}`);
  const hashedPassword = user.hashedPassword;
  if (!hashedPassword) {
    console.log('User has no password set:', email);
    return null;
  }

  const passwordIsValid = await bcrypt.compare(password, hashedPassword);
  if (!passwordIsValid) {
    console.log('Password validation failed for:', email);
    return null;
  }

  console.log('Password validation successful, proceeding to initiate MFA');

  // --- Initiate MFA Flow (Send Code) ---
  // Initialize 2FA settings if they don't exist (should always be email now)
  if (!user.twoFactorAuth) {
    user.twoFactorAuth = {
      enabled: true,
      method: 'email',
      temporaryCode: null,
      codeGeneratedAt: null
    };
    await user.save(); // This save is fine here as it's before validation errors usually occur
  }

  console.log(`Sending MFA code for ${email}, user ID: ${user._id}`);
  const userObjectIdString = user._id.toString();
  const codeSent = await sendEmailVerificationCode(userObjectIdString);
  if (!codeSent) {
    console.error('Failed to send email verification code for:', email);
    return null; // Indicate code sending failure
  }

  // Return user details WITH requiresMfa flag
  console.log('MFA code sent. Returning requiresMfa=true for:', email);
  return {
    id: userObjectIdString,
    name: user.name,
    email: user.email,
    requiresMfa: true,
    mfaMethod: 'email' 
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
  
  // Check for temporary code from SMS/email
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
  
  // For TOTP app authentication
  // In a real app, use a proper TOTP library here
  if (user.twoFactorAuth.method === 'app') {
    // For development, accept '123456' as a valid code
    if (code === '123456') {
      return true;
    }
    
    // In production, use something like:
    // return speakeasy.totp.verify({ 
    //   secret: user.twoFactorAuth.secret,
    //   encoding: 'base32',
    //   token: code,
    //   window: 1 // Allow 1 step before/after for clock drift
    // });
  }
  
  return false;
}

export const authOptions: NextAuthOptions = {
  providers: [
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        
        // Add MFA status to token if applicable
        if ('requiresMfa' in user) {
          token.requiresMfa = user.requiresMfa;
          token.mfaMethod = user.mfaMethod;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        
        // Add MFA status to session if applicable
        if ('requiresMfa' in token) {
          session.requiresMfa = token.requiresMfa;
          session.mfaMethod = token.mfaMethod;
        }
      }
      return session;
    },
    // Fix redirect logic to be more reliable
    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect called with:', { url, baseUrl });

      // IMPORTANT: Never redirect to any verification pages
      // The email verification modal will handle everything
      if (url.includes('/mfa') || 
          url.includes('/auth/mfa') || 
          url.includes('/verify') || 
          url.includes('/verification') ||
          url.includes('/two-factor')) {
        console.log('Intercepted MFA redirect, going to dashboard instead');
        return `${baseUrl}/dashboard`;
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