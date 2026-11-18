import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Strict singleton across all Next.js environments and module reloads
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Always attach to globalThis so duplicate pools are NEVER created
globalForPrisma.prisma = prisma;

export default prisma;
