import NextAuth from "next-auth";
import { authOptions } from "./options";

export const dynamic = 'force-dynamic';

// Create the handler with proper error handling
const handler = NextAuth(authOptions);

// Export the handler for the Next.js API route
export { handler as GET, handler as POST };