import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcrypt from 'bcrypt';
import connectToDatabase from '@/lib/db/connect';
import getUserModel from '@/lib/db/models/user';
import { v4 as uuidv4 } from 'uuid';

// Authenticate user with secure password comparison
async function authenticateUser(email: string, password: string) {
  await connectToDatabase();
  const UserModel = getUserModel();
  
  let user = await UserModel.findOne({ email });
  
  // If this is the very first login and we're in demo mode, create the user
  if (!user && email === 'demo@example.com' && password === 'demo123') {
    // Create demo user with hashed password
    const hashedPassword = await bcrypt.hash('demo123', 10);
    user = await UserModel.create({
      id: uuidv4(),
      name: 'Demo User',
      email: 'demo@example.com',
      hashedPassword: hashedPassword,
      createdAt: new Date().toISOString(),
      pools: []
    });
  }
  
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
  
  // Update last login time
  user.lastLogin = new Date().toISOString();
  await user.save();
  
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          const user = await authenticateUser(
            credentials.email,
            credentials.password
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
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