import { prisma } from "@/lib/db/prisma";
import { tailorResume } from "@/lib/services/resume-service";
import { generateEmail, sendOutreachEmail } from "@/lib/services/email-service";

export interface AutoApplyOptions {
  userId: string;
  jobListingId: string;
  baseResumeId?: string; // Optional, will use default if not provided
}

export async function processAutoApply(options: AutoApplyOptions) {
  const { userId, jobListingId } = options;

  // 1. Fetch User and Job
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tier: true, apiKeysEncrypted: true },
  });
  
  if (!user) throw new Error("User not found");

  const job = await prisma.jobListing.findFirst({
    where: { id: jobListingId, userId },
  });

  if (!job) throw new Error("Job not found");

  // 2. Resolve Base Resume
  let baseResumeId = options.baseResumeId;
  if (!baseResumeId) {
    const defaultResume = await prisma.baseResume.findFirst({
      where: { userId, isDefault: true },
    });
    if (!defaultResume) {
      const anyResume = await prisma.baseResume.findFirst({
        where: { userId },
      });
      if (!anyResume) throw new Error("No base resume available for tailoring");
      baseResumeId = anyResume.id;
    } else {
      baseResumeId = defaultResume.id;
    }
  }

  const baseResume = await prisma.baseResume.findUnique({
    where: { id: baseResumeId },
  });

  if (!baseResume) throw new Error("Base resume not found");

  // 3. Upsert Application
  const application = await prisma.application.upsert({
    where: {
      userId_jobListingId: { userId, jobListingId },
    },
    create: {
      userId,
      jobListingId,
      status: "discovered",
      isAutoApplied: true,
    },
    update: {
      isAutoApplied: true,
    },
  });

  // 4. Tailor Resume
  let userKeys;
  if (user.tier === "pro" && user.apiKeysEncrypted) {
    const { decryptJson } = await import("@/lib/encryption");
    try {
      const decoded = decryptJson<any>(user.apiKeysEncrypted);
      userKeys = {
        groq: decoded.groqApiKey,
        deepseek: decoded.deepseekApiKey,
      };
    } catch (err) {
      console.warn("Failed to decrypt user API keys");
    }
  }

  const tailorResult = await tailorResume(baseResume.rawText, job.description, userKeys);

  const tailored = await prisma.tailoredResume.create({
    data: {
      applicationId: application.id,
      baseResumeId: baseResume.id,
      jobListingId: job.id,
      tailoredText: tailorResult.tailoredText,
      changesSummary: tailorResult.changesSummary,
      atsScore: tailorResult.atsScore,
      llmModelUsed: tailorResult.llmModelUsed,
    },
  });

  await prisma.application.update({
    where: { id: application.id },
    data: { status: "resume_tailored" },
  });

  // 5. Scrape HR Contacts
  // We extract a rough domain from the job URL if possible, though often it's a job board URL.
  let domain = undefined;
  try {
    if (job.url && !job.url.includes("naukri.com") && !job.url.includes("wellfound.com") && !job.url.includes("remoteok.com")) {
      domain = new URL(job.url).hostname.replace("www.", "");
    }
  } catch (e) {
    // Invalid URL
  }

  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
  const hrRes = await fetch(`${pythonServiceUrl}/scrape/hr-contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: job.company,
      domain: domain,
    }),
  });

  if (!hrRes.ok) {
    throw new Error("Failed to contact python scraper for HR contacts");
  }

  const hrData = await hrRes.json();
  const contacts = hrData.contacts || [];
  
  if (contacts.length === 0) {
    throw new Error(`Could not find any HR emails for ${job.company}`);
  }

  // Pick the highest confidence contact
  const targetContact = contacts[0];

  // 6. Generate Email
  const draft = await generateEmail(
    application.id,
    targetContact.email,
    targetContact.name || "Hiring Team",
    "Recruiter / Hiring Manager"
  );

  // 7. Send Email
  // If dryRunEnabled is true on the user, this just marks it as sent-dry-run.
  await sendOutreachEmail(draft.id);

  return {
    success: true,
    applicationId: application.id,
    tailoredResumeId: tailored.id,
    emailId: draft.id,
    targetEmail: targetContact.email,
  };
}
