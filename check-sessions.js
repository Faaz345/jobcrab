const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.scrapeSession.findMany({
    orderBy: { startedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      status: true,
      query: true,
      sources: true,
      totalResults: true,
      startedAt: true
    }
  });
  console.log("Recent Scrape Sessions:");
  console.dir(sessions, { depth: null });
}
main().finally(() => prisma.$disconnect());
