const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RENDER_URL = "https://jobcrab-python-scraper.onrender.com";

async function runTest() {
  // Get a valid user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in database to run test");
    return;
  }

  console.log(`Using user: ${user.email} (${user.id})`);

  // Create a scrape session
  const session = await prisma.scrapeSession.create({
    data: {
      userId: user.id,
      query: "AI Engineer Jobs in Mumbai (Render Test)",
      sources: ["remoteok", "linkedin", "naukri"],
      status: "pending"
    }
  });

  console.log(`Created test session in DB: ${session.id}`);

  // Trigger Render scraping
  console.log("Calling Render API /scrape/start...");
  try {
    const res = await fetch(`${RENDER_URL}/scrape/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        user_id: user.id,
        query: "AI Engineer in Mumbai",
        sources: ["remoteok", "linkedin", "naukri"],
        limit: 15,
        pages: 1
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Render responded with error: ${res.status} - ${errText}`);
      return;
    }

    const data = await res.json();
    console.log("Render start response:", data);
  } catch (err) {
    console.error("Failed to call Render API:", err);
    return;
  }

  // Poll database for status
  console.log("Polling database for results (60s max)...");
  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const current = await prisma.scrapeSession.findUnique({
      where: { id: session.id }
    });

    console.log(`Poll ${i+1}: Status = ${current.status}, Total Results = ${current.totalResults}`);

    if (current.status === "completed" || current.status === "failed") {
      break;
    }
  }

  // Get jobs saved
  const jobs = await prisma.jobListing.findMany({
    where: { scrapeSessionId: session.id },
    select: {
      title: true,
      company: true,
      source: true
    }
  });

  console.log("\nJobs saved in database for this session:");
  console.dir(jobs, { depth: null });
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
