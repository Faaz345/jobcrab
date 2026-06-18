import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";
import { bookmarkSchema } from "@/lib/validators/jobs";
import { ensureApplicationForJob } from "@/lib/services/application-service";

/**
 * PATCH /api/jobs/[id]/bookmark â€” toggle bookmark flag
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = bookmarkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const job = await prisma.jobListing.updateMany({
    where: { id, userId: user.id },
    data: { isBookmarked: parsed.data.isBookmarked },
  });

  if (job.count === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Auto-create an Application (status: discovered) when a job is bookmarked
  if (parsed.data.isBookmarked) {
    try {
      await ensureApplicationForJob(user.id, id);
    } catch (e) {
      console.error("ensureApplicationForJob failed:", e);
    }
  }

  return NextResponse.json({
    message: parsed.data.isBookmarked ? "Bookmarked" : "Unbookmarked",
    isBookmarked: parsed.data.isBookmarked,
  });
}
