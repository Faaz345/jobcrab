import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendOutreachEmail } from "@/lib/services/email-service";
import { prisma } from "@/lib/db/prisma";

// Mock the prisma dependency
vi.mock("@/lib/db/prisma", () => {
  return {
    prisma: {
      outreachEmail: {
        findUnique: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      application: {
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

describe("Outreach Email Safety Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw an error if daily email limit is reached", async () => {
    // Mock the email draft details
    vi.mocked(prisma.outreachEmail.findUnique).mockResolvedValue({
      id: "test-email-id",
      recipientEmail: "recruiter@company.com",
      jobListingId: "job-123",
      applicationId: "app-456",
      subject: "Test Subject",
      bodyHtml: "<p>Hello</p>",
      bodyPlain: "Hello",
      status: "drafted",
      isDryRun: false,
      application: {
        user: {
          id: "user-1",
          name: "John Doe",
          maxEmailsPerDay: 5,
          dryRunEnabled: false,
        },
      },
    } as any);

    // Mock count to return 5 (limit is 5)
    vi.mocked(prisma.outreachEmail.count).mockResolvedValue(5);

    await expect(sendOutreachEmail("test-email-id")).rejects.toThrow(
      "Daily send limit of 5 emails reached"
    );
  });

  it("should throw an error if duplicate recipient exists for the same job", async () => {
    // Mock email draft
    vi.mocked(prisma.outreachEmail.findUnique).mockResolvedValue({
      id: "test-email-id",
      recipientEmail: "recruiter@company.com",
      jobListingId: "job-123",
      applicationId: "app-456",
      subject: "Test Subject",
      bodyHtml: "<p>Hello</p>",
      bodyPlain: "Hello",
      status: "drafted",
      isDryRun: false,
      application: {
        user: {
          id: "user-1",
          name: "John Doe",
          maxEmailsPerDay: 5,
          dryRunEnabled: false,
        },
      },
    } as any);

    // Mock daily count under limit
    vi.mocked(prisma.outreachEmail.count).mockResolvedValue(2);

    // Mock duplicate check returning a matching sent email
    vi.mocked(prisma.outreachEmail.findFirst).mockResolvedValue({
      id: "existing-email-id",
      recipientEmail: "recruiter@company.com",
      status: "sent",
    } as any);

    await expect(sendOutreachEmail("test-email-id")).rejects.toThrow(
      "You have already successfully sent an outreach email to recruiter@company.com for this job."
    );
  });

  it("should execute a dry-run send without sending real SMTP email if dryRunEnabled is true", async () => {
    // Mock email draft with dryRunEnabled: true
    vi.mocked(prisma.outreachEmail.findUnique).mockResolvedValue({
      id: "test-email-id",
      recipientEmail: "recruiter@company.com",
      jobListingId: "job-123",
      applicationId: "app-456",
      subject: "Test Subject",
      bodyHtml: "<p>Hello</p>",
      bodyPlain: "Hello",
      status: "drafted",
      isDryRun: true,
      application: {
        id: "app-456",
        user: {
          id: "user-1",
          name: "John Doe",
          maxEmailsPerDay: 5,
          dryRunEnabled: true, // Dry run enabled
        },
      },
    } as any);

    vi.mocked(prisma.outreachEmail.count).mockResolvedValue(0);
    vi.mocked(prisma.outreachEmail.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.outreachEmail.update).mockResolvedValue({
      id: "test-email-id",
      status: "sent",
      isDryRun: true,
    } as any);

    const result = await sendOutreachEmail("test-email-id");

    expect(result.status).toBe("sent");
    expect(result.isDryRun).toBe(true);
    expect(prisma.outreachEmail.update).toHaveBeenCalledWith({
      where: { id: "test-email-id" },
      data: expect.objectContaining({
        status: "sent",
        isDryRun: true,
        smtpMessageId: "dry-run-message-id",
      }),
    });
  });
});
