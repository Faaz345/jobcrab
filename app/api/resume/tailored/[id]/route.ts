import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";

/**
 * GET /api/resume/tailored/[id]
 * Get a tailored resume with its linked job and base resume.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tailored = await prisma.tailoredResume.findFirst({
      where: {
        id,
        application: { userId: authUser.id },
      },
      include: {
        baseResume: {
          select: { id: true, name: true, rawText: true },
        },
        jobListing: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            description: true,
            source: true,
            url: true,
          },
        },
        application: {
          select: { id: true, status: true },
        },
      },
    });

    if (!tailored) {
      return NextResponse.json(
        { error: "Tailored resume not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tailored);
  } catch (error) {
    console.error("Error fetching tailored resume:", error);
    return NextResponse.json(
      { error: "Failed to fetch tailored resume" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/resume/tailored/[id]
 * Update the tailored text (user edits).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify ownership
    const tailored = await prisma.tailoredResume.findFirst({
      where: {
        id,
        application: { userId: authUser.id },
      },
    });

    if (!tailored) {
      return NextResponse.json(
        { error: "Tailored resume not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.tailoredResume.update({
      where: { id },
      data: {
        tailoredText: body.tailoredText,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating tailored resume:", error);
    return NextResponse.json(
      { error: "Failed to update tailored resume" },
      { status: 500 }
    );
  }
}
