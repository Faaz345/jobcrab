import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";

/**
 * GET /api/jobs/sessions
 * Returns the user's previous search sessions with query, timing, sources,
 * status and per-source result counts.
 */
export async function GET() {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.scrapeSession.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
    take: 50,
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

  // Per-source counts for each session
  const grouped = await prisma.jobListing.groupBy({
    by: ["scrapeSessionId", "source"],
    where: {
      userId: user.id,
      scrapeSessionId: { in: sessions.map((s) => s.id) },
    },
    _count: { _all: true },
  });

  const countsBySession: Record<string, Record<string, number>> = {};
  for (const row of grouped) {
    const sid = row.scrapeSessionId as string;
    countsBySession[sid] ??= {};
    countsBySession[sid][row.source] = row._count._all;
  }

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      ...s,
      sourceCounts: countsBySession[s.id] || {},
    })),
  });
}
