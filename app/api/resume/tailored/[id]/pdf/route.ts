import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";
import { generatePdf } from "@/lib/services/resume-service";

/**
 * POST /api/resume/tailored/[id]/pdf
 * Generate a PDF from the tailored resume text.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tailored = await prisma.tailoredResume.findFirst({
      where: {
        id,
        application: { userId: user.id },
      },
      include: {
        jobListing: { select: { title: true, company: true } },
      },
    });

    if (!tailored) {
      return NextResponse.json(
        { error: "Tailored resume not found" },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generatePdf(
      tailored.tailoredText,
      user?.user_metadata?.name || undefined
    );

    // Return PDF as download
    const fileName = `resume_${tailored.jobListing.company.replace(/\s+/g, "_")}_${tailored.jobListing.title.replace(/\s+/g, "_")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resume/tailored/[id]/pdf
 * Download the generated PDF (same as POST but for direct download links).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return POST(req, context);
}
