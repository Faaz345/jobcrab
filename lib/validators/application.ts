import { z } from "zod/v4";

const applicationStatusEnum = z.enum([
  "discovered",
  "resume_tailored",
  "email_drafted",
  "email_sent",
  "response_received",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);

export const updateStatusSchema = z.object({
  status: applicationStatusEnum,
});

export const updateNotesSchema = z.object({
  notes: z.string().max(5000, "Notes must be at most 5000 characters"),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
