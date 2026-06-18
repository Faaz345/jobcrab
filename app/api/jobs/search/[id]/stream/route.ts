import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";

/**
 * SSE endpoint that streams new job listings as they're scraped.
 * The client subscribes with EventSource, and we poll the DB every 2s.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  // Verify the session belongs to the user
  const scrapeSession = await prisma.scrapeSession.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!scrapeSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let lastCount = 0;
  let isCompleted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Poll loop
      const poll = async () => {
        try {
          // Get current session status
          const currentSession = await prisma.scrapeSession.findUnique({
            where: { id: sessionId },
          });

          if (!currentSession) {
            sendEvent({ status: "error", message: "Session not found" });
            controller.close();
            return;
          }

          // Get new jobs since last poll
          const jobs = await prisma.jobListing.findMany({
            where: { scrapeSessionId: sessionId },
            orderBy: { scrapedAt: "desc" },
          });

          const totalJobs = jobs.length;

          if (totalJobs > lastCount) {
            const newJobs = jobs.slice(0, totalJobs - lastCount);
            sendEvent({
              status: currentSession.status,
              total_jobs: totalJobs,
              new_jobs: newJobs.map((j) => ({
                id: j.id,
                title: j.title,
                company: j.company,
                location: j.location,
                salaryRange: j.salaryRange,
                source: j.source,
                companyLogoUrl: j.companyLogoUrl,
                url: j.url,
                tags: j.tags,
                isBookmarked: j.isBookmarked,
                scrapedAt: j.scrapedAt,
              })),
            });
            lastCount = totalJobs;
          }

          // Check if completed
          if (
            currentSession.status === "completed" ||
            currentSession.status === "failed"
          ) {
            sendEvent({
              status: currentSession.status,
              total_jobs: totalJobs,
              completed: true,
            });
            controller.close();
            isCompleted = true;
            return;
          }

          // Continue polling
          if (!isCompleted) {
            setTimeout(poll, 2000);
          }
        } catch (error) {
          console.error("SSE poll error:", error);
          sendEvent({ status: "error", message: "Polling failed" });
          controller.close();
        }
      };

      // Start first poll
      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
