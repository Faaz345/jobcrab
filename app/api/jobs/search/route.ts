import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validators/jobs";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = searchQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { query, sources, limit, pages } = parsed.data;

    // Create scrape session in DB
    const scrapeSession = await prisma.scrapeSession.create({
      data: {
        userId: user.id,
        query,
        sources,
        status: "pending",
      },
    });

    // Call Python service to start scraping
    try {
      const pyResponse = await fetch(`${PYTHON_SERVICE_URL}/scrape/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: scrapeSession.id,
          user_id: user.id,
          query,
          sources,
          limit,
          pages,
        }),
      });

      if (!pyResponse.ok) {
        // Update session as failed
        await prisma.scrapeSession.update({
          where: { id: scrapeSession.id },
          data: { status: "failed" },
        });
        return NextResponse.json(
          { error: "Failed to start scraping service" },
          { status: 502 }
        );
      }
    } catch {
      // Python service might not be running — mark as failed
      await prisma.scrapeSession.update({
        where: { id: scrapeSession.id },
        data: { status: "failed" },
      });
      return NextResponse.json(
        { error: "Scraping service unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        sessionId: scrapeSession.id,
        status: "running",
        message: `Scraping started from ${sources.join(", ")}`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
