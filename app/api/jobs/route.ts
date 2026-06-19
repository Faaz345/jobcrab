import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";

/**
 * GET /api/jobs — paginated list of all user's scraped jobs
 * Query params: page, limit, source, bookmarked, search
 */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const source = searchParams.get("source");
  const bookmarked = searchParams.get("bookmarked");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "scrapedAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  // Build where clause
  const where: Record<string, unknown> = {
    userId: user.id,
  };

  if (source) {
    where.source = source;
  }
  if (bookmarked === "true") {
    where.isBookmarked = true;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  const latestSession = searchParams.get("latestSession") === "true";
  if (latestSession) {
    const lastJob = await prisma.jobListing.findFirst({
      where: { userId: user.id },
      orderBy: { scrapedAt: 'desc' },
      select: { scrapeSessionId: true }
    });
    if (lastJob?.scrapeSessionId) {
      where.scrapeSessionId = lastJob.scrapeSessionId;
    }
  }

  const [jobs, total] = await Promise.all([
    prisma.jobListing.findMany({
      where: where as any,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
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
        postedAt: true,
        scrapedAt: true,
      },
    }),
    prisma.jobListing.count({ where: where as any }),
  ]);

  return NextResponse.json({
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
