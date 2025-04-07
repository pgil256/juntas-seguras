import NextAuth from "next-auth";
import { TwoFactorMethod } from "../types/security";

declare module "next-auth" {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    /** Indicates if MFA verification is required */
    requiresMfa?: boolean;
    /** The MFA method to use */
    mfaMethod?: TwoFactorMethod;
  }
  
  /**
   * Extend the built-in user types
   */
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    /** Indicates if MFA verification is required */
    requiresMfa?: boolean;
    /** The MFA method to use */
    mfaMethod?: TwoFactorMethod;
  }
}

declare module "next-auth/jwt" {
  /** Extend the JWT token types */
  interface JWT {
    id: string;
    /** Indicates if MFA verification is required */
    requiresMfa?: boolean;
    /** The MFA method to use */
    mfaMethod?: TwoFactorMethod;
  }
}