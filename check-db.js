const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.jobListing.findMany({
    where: { scrapeSessionId: '09c10ff5-e163-4a42-8517-6420a2c04014' },
    select: {
      title: true,
      company: true,
      source: true
    }
  });
  console.log("Jobs from session 09c10ff5-e163-4a42-8517-6420a2c04014:");
  console.dir(jobs, { depth: null });
}
main().finally(() => prisma.$disconnect());
