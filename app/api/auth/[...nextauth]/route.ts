
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  // REMOVED ADAPTER: Running in No-DB Mode
  // adapter: PrismaAdapter(prisma), 
  
  providers: [
    CredentialsProvider({
        id: "guest",
        name: "Guest",
        credentials: {},
        async authorize(credentials, req) {
            return {
                id: "guest_" + Date.now(),
                name: "Guest Commander",
                email: null,
                image: null,
                isGuest: true
            };
        }
    })
  ],
  callbacks: {
    async session({ session, user, token }: any) {
      if (session.user) {
        session.user.id = user?.id || token?.sub;
        session.user.isGuest = true;
      }
      return session;
    },
    async jwt({ token, user }: any) {
        if (user) {
            token.id = user.id;
        }
        return token;
    }
  },
  session: {
    strategy: "jwt",
  },
  secret: "dev-secret-key-change-in-prod",
};

const handler = NextAuth(authOptions as any);

export { handler as GET, handler as POST };
