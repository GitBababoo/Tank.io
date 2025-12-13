import NextAuth from "next-auth"
import { prisma } from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials";

// Using V5 Beta syntax or V4 compatible wrapper depending on install
// This is a standard V5 structure
const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Simple Guest/Credentials for demo (Replace with Google/GitHub in prod)
    CredentialsProvider({
        name: "Guest Access",
        credentials: {
            username: { label: "Username", type: "text", placeholder: "Player" }
        },
        async authorize(credentials, req) {
            // For this game demo, we just allow anyone as a guest
            const user = { id: "guest_" + Math.random().toString(36).slice(2), name: credentials?.username || "Guest", email: null };
            return user;
        }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
      async session({ session, token }) {
          if (session.user && token.sub) {
              session.user.id = token.sub; // Pass ID to client
          }
          return session;
      }
  }
});

export { handler as GET, handler as POST }