import { z } from "zod/v4";

export const generateEmailSchema = z.object({
  applicationId: z.string().uuid("Invalid application ID").optional(),
  jobId: z.string().uuid("Invalid job ID").optional(),
  recipientEmail: z.email("Please enter a valid recipient email"),
  recipientName: z
    .string()
    .min(1, "Recipient name is required")
    .max(200)
    .optional(),
});

export const sendEmailSchema = z.object({
  emailId: z.string().uuid("Invalid email ID"),
});

export type GenerateEmailInput = z.infer<typeof generateEmailSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
