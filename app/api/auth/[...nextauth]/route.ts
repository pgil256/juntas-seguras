import NextAuth from "next-auth";
import { authOptions } from "./options";

// Create the handler with proper error handling
const handler = NextAuth(authOptions);

// Export the handler for the Next.js API route
export { handler as GET, handler as POST };