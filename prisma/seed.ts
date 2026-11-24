import { DemoResetService } from "../server/services/demo-reset.service";
import prisma from "../lib/prisma";

async function main() {
  console.log("Resetting and seeding deterministic classroom demo data...");
  const summary = await DemoResetService.reset();
  console.log(
    `Seed complete: ${summary.users} users, ${summary.areas} areas, ${summary.slots} slots.`
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
