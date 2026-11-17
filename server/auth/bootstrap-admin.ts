import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function bootstrapAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Usage: npx tsx server/auth/bootstrap-admin.ts <email>");
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: cleanEmail },
    update: {
      role: UserRole.ADMIN,
    },
    create: {
      email: cleanEmail,
      name: cleanEmail.split("@")[0].replace(".", " "),
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Successfully assigned role ${UserRole.ADMIN} to user: ${user.name} (${user.email})`);
}

bootstrapAdmin()
  .catch((e) => {
    console.error("❌ Failed to bootstrap admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
