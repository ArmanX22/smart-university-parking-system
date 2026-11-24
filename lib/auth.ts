import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { requireProductionSecret, resolveCredentialRole } from "@/lib/auth-policy";

const providers: NextAuthOptions["providers"] = [];

// 1. Google OAuth Provider (Active if credentials configured in .env)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  // DEMO IDENTITY PROVIDER (Fixed demo accounts only)
  CredentialsProvider({
    id: "demo",
    name: "Demo Accounts",
    credentials: {
      email: { label: "Demo Email", type: "email" },
    },
    async authorize(credentials) {
      if (!credentials?.email) {
        throw new Error("Demo email is required.");
      }

      const email = credentials.email.trim().toLowerCase();

      // Check for fixed demo identities only
      const demoEmails: Record<string, string> = {
        "driver@university.edu": "DRIVER",
        "admin@university.edu": "ADMIN",
        "attendant@university.edu": "ATTENDANT",
      };

      const expectedRole = demoEmails[email] as UserRole;
      if (!expectedRole) {
        // Non-demo email: always force to DRIVER
        // Create/ensure user exists for consistency
        let user = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
              user = await prisma.user.create({
                data: { email, name: email.split("@")[0].replace(".", " "), role: "DRIVER" }
              });
            }
            break;
          } catch (err) {
            if (attempt === 3) throw err;
            await new Promise(resolve => setTimeout(resolve, 600 * attempt));
          }
        }
        if (!user) throw new Error("Could not authenticate user record.");
return { id: user.id, name: user.name, email: user.email, role: user.role };
      }

      // Verify production secrets before granting privileged roles
      const requiredSecret = requireProductionSecret(
        "NEXTAUTH_SECRET",
        process.env.NEXTAUTH_SECRET,
        process.env.NODE_ENV,
        "local-development-secret-change-before-deploy"
      );
      if (!requiredSecret) {
        throw new Error("Authentication failed: missing production secret");
      }

      // Return demo identity with database lookup for ID
      let user = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma.user.create({
              data: { email, name: email.split("@")[0].replace(".", " "), role: expectedRole as UserRole }
            });
          } else if (user.role !== expectedRole) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { role: expectedRole }
            });
          }
          break;
        } catch (err) {
          if (attempt === 3) throw err;
          await new Promise(resolve => setTimeout(resolve, 600 * attempt));
        }
      }
      if (!user) throw new Error("Could not authenticate user record.");
      if (!user) throw new Error("Could not authenticate user record.");
return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: UserRole }).role || UserRole.DRIVER;
      }

      // Only query TiDB if ID or role is not yet cached in the token
      if ((!token.id || !token.role) && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } catch (err) {
          console.warn("[Auth JWT] Non-blocking DB check failure:", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  secret: requireProductionSecret(
    "NEXTAUTH_SECRET",
    process.env.NEXTAUTH_SECRET,
    process.env.NODE_ENV,
    "local-development-secret-change-before-deploy"
  ),
};

export default authOptions;
