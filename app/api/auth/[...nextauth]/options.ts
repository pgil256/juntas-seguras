import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from 'bcrypt';
import connectToDatabase from '@/lib/db/connect';
import getUserModel from '@/lib/db/models/user';
import { v4 as uuidv4 } from 'uuid';

// Authenticate user with secure password comparison
async function authenticateUser(email: string, password: string, mfaCode?: string) {
  await connectToDatabase();
  const UserModel = getUserModel();
  
  let user = await UserModel.findOne({ email });
  
  // No automatic user creation - users must register first
  if (!user) {
    return null;
  }
  
  // Securely compare the provided password with the stored hash
  let isValid = false;
  
  // Handle both hashed and legacy non-hashed passwords
  if (user.hashedPassword.startsWith('$2')) {
    // This is a bcrypt hash (starts with $2a$, $2b$, etc.)
    isValid = await bcrypt.compare(password, user.hashedPassword);
  } else {
    // Legacy plain text password - migrate to hashed on successful login
    isValid = user.hashedPassword === password;
    
    if (isValid) {
      // Update to hashed password for future logins
      user.hashedPassword = await bcrypt.hash(password, 10);
      await user.save();
    }
  }
  
  if (!isValid) {
    return null;
  }
  
  // Check if MFA is enabled for this user
  if (user.twoFactorAuth?.enabled) {
    // If MFA is enabled and no code is provided, mark the user as pending MFA verification
    if (!mfaCode) {
      // Set the pendingMfaVerification flag to true
      user.pendingMfaVerification = true;
      await user.save();
      
      // Return a special response indicating MFA is required
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        requiresMfa: true,
        mfaMethod: user.twoFactorAuth.method
      };
    }
    
    // If MFA code is provided, verify it
    // In a real app, this would call validateMfaCode with proper validation
    // We're using a placeholder function here for now
    const mfaValid = await validateMfaCode(user.id, mfaCode);
    if (!mfaValid) {
      return null;
    }
    
    // MFA is valid, clear the pending flag
    user.pendingMfaVerification = false;
  }
  
  // Update last login time
  user.lastLogin = new Date().toISOString();
  await user.save();
  
  return {
    id: user.id,
    name: user.name,
    email: user.email
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
          return null;
        }
        
        try {
          const user = await authenticateUser(
            credentials.email,
            credentials.password,
            credentials.mfaCode || undefined
          );
          
          return user;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
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
        
        // If MFA is required, add that to the token
        if ('requiresMfa' in user && user.requiresMfa) {
          token.requiresMfa = true;
          token.mfaMethod = user.mfaMethod;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        
        // Add MFA status to the session if applicable
        if ('requiresMfa' in token) {
          session.requiresMfa = token.requiresMfa;
          session.mfaMethod = token.mfaMethod;
        }
      }
      return session;
    },
    // Fix redirect logic to be more reliable
    async redirect({ url, baseUrl }) {
      // Handle absolute URLs that should be allowed
      if (url && url.startsWith('http')) {
        // Only allow redirects to same host or localhost for safety
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        if (urlObj.host === baseUrlObj.host || urlObj.host.includes('localhost')) {
          return url;
        }
      }
      
      // For relative URLs, prepend baseUrl 
      if (url && url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // Default fallback route
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