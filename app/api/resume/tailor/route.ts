import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";
import { tailorResume } from "@/lib/services/resume-service";

/**
 * POST /api/resume/tailor
 * Tailor a base resume for a specific job listing using AI.
 * Creates Application + TailoredResume records.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobListingId, baseResumeId } = body;

    if (!jobListingId || !baseResumeId) {
      return NextResponse.json(
        { error: "jobListingId and baseResumeId are required" },
        { status: 400 }
      );
    }

    // Fetch job listing
    const job = await prisma.jobListing.findFirst({
      where: { id: jobListingId, userId: authUser.id },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job listing not found" },
        { status: 404 }
      );
    }

    // Fetch base resume
    const baseResume = await prisma.baseResume.findFirst({
      where: { id: baseResumeId, userId: authUser.id },
    });

    if (!baseResume) {
      return NextResponse.json(
        { error: "Base resume not found" },
        { status: 404 }
      );
    }

    // Upsert Application record
    const application = await prisma.application.upsert({
      where: {
        userId_jobListingId: {
          userId: authUser.id,
          jobListingId: job.id,
        },
      },
      create: {
        userId: authUser.id,
        jobListingId: job.id,
        status: "resume_tailored",
      },
      update: {
        status: "resume_tailored",
      },
    });

    // Fetch user for tier and API keys
    const profile = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { tier: true, apiKeysEncrypted: true },
    });

    let userKeys;
    if (profile?.tier === "pro" && profile.apiKeysEncrypted) {
      const { decryptJson } = await import("@/lib/encryption");
      try {
        const decoded = decryptJson<any>(profile.apiKeysEncrypted);
        userKeys = {
          groq: decoded.groqApiKey,
          deepseek: decoded.deepseekApiKey,
        };
      } catch (err) {
        console.warn("Failed to decrypt user API keys, falling back to platform keys");
      }
    }

    // Call LLM to tailor the resume
    const result = await tailorResume(baseResume.rawText, job.description, userKeys);

    // Create TailoredResume record
    const tailored = await prisma.tailoredResume.create({
      data: {
        applicationId: application.id,
        baseResumeId: baseResume.id,
        jobListingId: job.id,
        tailoredText: result.tailoredText,
        changesSummary: result.changesSummary,
        atsScore: result.atsScore,
        llmModelUsed: result.llmModelUsed,
      },
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        userId: authUser.id,
        entityType: "resume",
        entityId: tailored.id,
        action: "created",
        metadata: {
          jobTitle: job.title,
          company: job.company,
          atsScore: result.atsScore,
          model: result.llmModelUsed,
        },
      },
    });

    return NextResponse.json({
      id: tailored.id,
      tailoredText: result.tailoredText,
      changesSummary: result.changesSummary,
      atsScore: result.atsScore,
      llmModelUsed: result.llmModelUsed,
      applicationId: application.id,
      jobTitle: job.title,
      company: job.company,
    });
  } catch (error) {
    console.error("Resume tailor error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to tailor resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
