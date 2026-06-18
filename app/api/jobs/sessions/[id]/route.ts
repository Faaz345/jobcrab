import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";

/**
 * GET /api/jobs/sessions/[id] - jobs belonging to one previous search session.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const scrapeSession = await prisma.scrapeSession.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      query: true,
      sources: true,
      status: true,
      totalResults: true,
      startedAt: true,
      completedAt: true,
    },
  });

  if (!scrapeSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const jobs = await prisma.jobListing.findMany({
    where: { scrapeSessionId: id, userId: user.id },
    orderBy: { scrapedAt: "desc" },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      salaryRange: true,
      url: true,
      source: true,
      companyLogoUrl: true,
      tags: true,
      isBookmarked: true,
      scrapedAt: true,
    },
  });

  return NextResponse.json({ session: scrapeSession, jobs });
}