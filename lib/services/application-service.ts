import { prisma } from "@/lib/db/prisma";
import type { ApplicationStatus, Prisma } from "@prisma/client";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "discovered",
  "resume_tailored",
  "email_drafted",
  "email_sent",
  "response_received",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export interface ApplicationFilters {
  status?: ApplicationStatus;
  source?: string;
  search?: string;
}

/** List a user's applications with nested job, latest resume, and latest email. */
export async function getApplications(userId: string, filters: ApplicationFilters = {}) {
  const where: Prisma.ApplicationWhereInput = { userId };

  if (filters.status) where.status = filters.status;
  if (filters.source) where.jobListing = { source: filters.source };
  if (filters.search) {
    where.jobListing = {
      ...(where.jobListing as object),
      OR: [
        { title: { contains: filters.search, mode: "insensitive" } },
        { company: { contains: filters.search, mode: "insensitive" } },
      ],
    };
  }

  const applications = await prisma.application.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      jobListing: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          source: true,
          companyLogoUrl: true,
          url: true,
        },
      },
      tailoredResumes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, atsScore: true, createdAt: true },
      },
      outreachEmails: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, recipientEmail: true, subject: true, sentAt: true, createdAt: true },
      },
    },
  });

  return applications;
}

/** Single application with a merged timeline built from audit logs of its entities. */
export async function getApplicationById(userId: string, id: string) {
  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: {
      jobListing: true,
      tailoredResumes: { orderBy: { createdAt: "desc" } },
      outreachEmails: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) return null;

  const entityIds = [
    application.jobListingId,
    application.id,
    ...application.tailoredResumes.map((r) => r.id),
    ...application.outreachEmails.map((e) => e.id),
  ];

  const logs = await prisma.auditLog.findMany({
    where: { userId, entityId: { in: entityIds } },
    orderBy: { createdAt: "asc" },
  });

  return { application, timeline: logs };
}

/** Update status, with validation, and write an audit entry. */
export async function updateStatus(userId: string, id: string, status: ApplicationStatus) {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const updated = await prisma.application.update({
    where: { id },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      entityType: "application",
      entityId: id,
      action: "updated",
      metadata: { from: existing.status, to: status },
    },
  });

  return updated;
}

/** Save user notes on an application. */
export async function updateNotes(userId: string, id: string, notes: string) {
  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.application.update({ where: { id }, data: { notes } });
}

/** Aggregate dashboard statistics. */
export async function getStats(userId: string) {
  const apps = await prisma.application.findMany({
    where: { userId },
    include: { jobListing: { select: { source: true } } },
  });

  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    const src = a.jobListing?.source || "unknown";
    bySource[src] = (bySource[src] || 0) + 1;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = apps.filter((a) => a.createdAt >= weekAgo).length;

  const emailsSent = await prisma.outreachEmail.count({
    where: { application: { userId }, status: "sent" },
  });

  // Response rate = responded (or further) applications / emails sent
  const respondedStatuses = ["response_received", "interview", "offer"];
  const responded = apps.filter((a) => respondedStatuses.includes(a.status)).length;
  const responseRate = emailsSent > 0 ? Number((responded / emailsSent).toFixed(2)) : 0;

  return {
    total: apps.length,
    by_status: byStatus,
    by_source: bySource,
    this_week: thisWeek,
    emails_sent: emailsSent,
    response_rate: responseRate,
  };
}

/** Auto-create an Application (discovered) when a job is bookmarked. */
export async function ensureApplicationForJob(userId: string, jobListingId: string) {
  return prisma.application.upsert({
    where: { userId_jobListingId: { userId, jobListingId } },
    create: { userId, jobListingId, status: "discovered" },
    update: {},
  });
}