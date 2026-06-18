import { prisma } from "@/lib/db/prisma";
import { complete } from "@/lib/services/llm-service";
import { decryptJson } from "@/lib/encryption";
import { EMAIL_GENERATE_SYSTEM_PROMPT, EMAIL_GENERATE_USER_PROMPT } from "@/lib/prompts/email-generate";
import { interpolate } from "@/lib/prompts/loader";
import nodemailer from "nodemailer";

export interface EmailGenerateResult {
  subject: string;
  bodyHtml: string;
  bodyPlain: string;
}

/**
 * Generate a personalized outreach email draft using AI.
 */
export async function generateEmail(
  applicationId: string,
  recipientEmail: string,
  recipientName?: string,
  recipientRole?: string
) {
  // Fetch application, job description, latest tailored resume, and user
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      jobListing: true,
      tailoredResumes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  const latestTailored = application.tailoredResumes[0];
  const job = application.jobListing;
  const user = application.user;

  // Extract highlights from tailored resume changes summary or just general description
  let highlights = "";
  if (latestTailored?.changesSummary && typeof latestTailored.changesSummary === "object") {
    const summary = latestTailored.changesSummary as any;
    if (Array.isArray(summary.skills_highlighted) && summary.skills_highlighted.length > 0) {
      highlights += `Skills highlighted: ${summary.skills_highlighted.join(", ")}\n`;
    }
    if (Array.isArray(summary.keywords_added) && summary.keywords_added.length > 0) {
      highlights += `Keywords matched: ${summary.keywords_added.join(", ")}\n`;
    }
    if (summary.summary) {
      highlights += `Tailoring summary: ${summary.summary}\n`;
    }
  }

  if (!highlights) {
    highlights = "Refer to the candidate's core background in software engineering/development.";
  }

  const userPrompt = interpolate(EMAIL_GENERATE_USER_PROMPT, {
    jobTitle: job.title,
    companyName: job.company,
    jobDescriptionSummary: job.description.slice(0, 2000),
    candidateName: user.name || "Candidate",
    resumeHighlights: highlights,
    recipientName: recipientName || "Hiring Manager",
    recipientRole: recipientRole || "Hiring Coordinator",
  });

  let userKeys;
  if (user.tier === "pro" && user.apiKeysEncrypted) {
    try {
      const decoded = decryptJson<any>(user.apiKeysEncrypted);
      userKeys = {
        groq: decoded.groqApiKey,
        deepseek: decoded.deepseekApiKey,
      };
    } catch (err) {
      console.warn("Failed to decrypt user API keys for email, falling back to platform keys");
    }
  }

  const response = await complete({
    messages: [
      { role: "system", content: EMAIL_GENERATE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 1000,
    responseFormat: { type: "json_object" },
  }, userKeys);

  let parsed: EmailGenerateResult;
  try {
    let content = response.content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    parsed = JSON.parse(content);
  } catch {
    console.error("Failed to parse LLM email response:", response.content);
    throw new Error("Failed to parse AI generated email. The model returned invalid JSON.");
  }

  // Create outreach email record in the database
  const outreachEmail = await prisma.outreachEmail.create({
    data: {
      applicationId: application.id,
      jobListingId: job.id,
      tailoredResumeId: latestTailored?.id || null,
      recipientEmail,
      recipientName: recipientName || null,
      subject: parsed.subject || `Application for ${job.title} at ${job.company}`,
      bodyHtml: parsed.bodyHtml || `<p>Hello ${recipientName || "Hiring Team"},</p>`,
      bodyPlain: parsed.bodyPlain || `Hello ${recipientName || "Hiring Team"},`,
      status: "drafted",
      isDryRun: user.dryRunEnabled,
    },
  });

  // Update application status to email_drafted
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "email_drafted" },
  });

  // Log audit trail
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entityType: "email",
      entityId: outreachEmail.id,
      action: "created",
      metadata: {
        recipientEmail,
        subject: outreachEmail.subject,
      },
    },
  });

  return outreachEmail;
}

/**
 * Execute the safety pipeline and send an outreach email.
 */
export async function sendOutreachEmail(emailId: string) {
  const email = await prisma.outreachEmail.findUnique({
    where: { id: emailId },
    include: {
      application: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!email) {
    throw new Error("Email not found");
  }

  const user = email.application.user;

  // 1. Check daily volume cap
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Count sent emails today (excluding dry-runs that didn't send real emails)
  const sentCount = await prisma.outreachEmail.count({
    where: {
      application: { userId: user.id },
      status: "sent",
      isDryRun: false,
      sentAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (sentCount >= user.maxEmailsPerDay && !user.dryRunEnabled) {
    throw new Error(`Daily send limit of ${user.maxEmailsPerDay} emails reached. Increase your limit in Settings.`);
  }

  // 2. Check duplicate recipient for this job
  const duplicate = await prisma.outreachEmail.findFirst({
    where: {
      jobListingId: email.jobListingId,
      recipientEmail: email.recipientEmail,
      status: "sent",
      id: { not: email.id },
    },
  });

  if (duplicate) {
    throw new Error(`You have already successfully sent an outreach email to ${email.recipientEmail} for this job.`);
  }

  // 3. Dispatch based on Dry-Run mode
  if (user.dryRunEnabled) {
    const updated = await prisma.outreachEmail.update({
      where: { id: emailId },
      data: {
        status: "sent",
        isDryRun: true,
        sentAt: new Date(),
        smtpMessageId: "dry-run-message-id",
      },
    });

    await prisma.application.update({
      where: { id: email.applicationId },
      data: { status: "email_sent" },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: "email",
        entityId: emailId,
        action: "sent",
        metadata: {
          isDryRun: true,
          recipient: email.recipientEmail,
          subject: email.subject,
        },
      },
    });

    return updated;
  }

  // Real Send via SMTP
  let smtpConfig: any = null;

  if (user.tier === "pro" && user.smtpCredentialsEncrypted) {
    try {
      smtpConfig = decryptJson<any>(user.smtpCredentialsEncrypted);
    } catch (err) {
      console.warn("Failed to decrypt custom SMTP credentials, falling back to platform SMTP");
    }
  }

  // Fallback to platform SMTP if user is free or no valid custom config exists
  if (!smtpConfig || !smtpConfig.email || !smtpConfig.appPassword) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP is not configured on the platform, and you have not provided custom credentials.");
    }
    smtpConfig = {
      email: process.env.SMTP_USER,
      appPassword: process.env.SMTP_PASS,
      smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
      smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost || "smtp.gmail.com",
      port: smtpConfig.smtpPort || 587,
      secure: smtpConfig.smtpPort === 465,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.appPassword,
      },
    } as any);

    // Verify SMTP connection config
    await transporter.verify();

    // Send Mail
    const mailOptions = {
      from: `"${user.name}" <${smtpConfig.email}>`,
      to: email.recipientEmail,
      subject: email.subject,
      text: email.bodyPlain,
      html: email.bodyHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    const updated = await prisma.outreachEmail.update({
      where: { id: emailId },
      data: {
        status: "sent",
        isDryRun: false,
        sentAt: new Date(),
        smtpMessageId: info.messageId || "smtp-message-id",
      },
    });

    await prisma.application.update({
      where: { id: email.applicationId },
      data: { status: "email_sent" },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: "email",
        entityId: emailId,
        action: "sent",
        metadata: {
          isDryRun: false,
          recipient: email.recipientEmail,
          subject: email.subject,
          smtpMessageId: info.messageId,
        },
      },
    });

    return updated;
  } catch (error: any) {
    await prisma.outreachEmail.update({
      where: { id: emailId },
      data: {
        status: "failed",
        errorMessage: error.message || String(error),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: "email",
        entityId: emailId,
        action: "failed",
        metadata: {
          error: error.message || String(error),
        },
      },
    });

    throw new Error(`SMTP Send Failed: ${error.message || error}`);
  }
}

/**
 * Skip/Archive an email draft.
 */
export async function skipOutreachEmail(emailId: string) {
  const email = await prisma.outreachEmail.update({
    where: { id: emailId },
    data: { status: "skipped" },
    include: {
      application: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: email.application.userId,
      entityType: "email",
      entityId: emailId,
      action: "skipped",
      metadata: {
        recipient: email.recipientEmail,
        subject: email.subject,
      },
    },
  });

  return email;
}
