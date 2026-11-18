import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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

// 2. Official Campus Credentials Provider (Email & Password / Role Switcher)
providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "University Credentials",
    credentials: {
      email: { label: "University Email", type: "email" },
      password: { label: "Password", type: "password" },
      role: { label: "Role", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email) {
        throw new Error("University email is required.");
      }

      const email = credentials.email.trim().toLowerCase();
      const role = (credentials.role?.toUpperCase() as UserRole) || UserRole.DRIVER;

      // Upsert user in TiDB to ensure campus user profile exists
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: email.split("@")[0].replace(".", " "),
            role,
          },
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      };
    },
  })
);

// Backward-compatible alias for existing sessions
providers.push(
  CredentialsProvider({
    id: "demo-credentials",
    name: "Campus Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      role: { label: "Role", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email) {
        throw new Error("Email is required for sign-in.");
      }

      const email = credentials.email.trim().toLowerCase();
      const role = (credentials.role?.toUpperCase() as UserRole) || UserRole.DRIVER;

      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: email.split("@")[0].replace(".", " "),
            role,
          },
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      };
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

      // Re-verify against live TiDB database so any role changes reflect instantly
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
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
  secret: process.env.NEXTAUTH_SECRET || "dev-insecure-secret-key-smart-parking-32chars",
};

export default authOptions;
