import { z } from "zod/v4";

export const uploadResumeSchema = z.object({
  name: z
    .string()
    .min(1, "Resume name is required")
    .max(200, "Resume name must be at most 200 characters"),
  rawText: z
    .string()
    .min(50, "Resume text must be at least 50 characters"),
  isDefault: z.boolean().default(false),
});

export const tailorRequestSchema = z.object({
  jobListingId: z.string().uuid("Invalid job listing ID"),
  baseResumeId: z.string().uuid("Invalid base resume ID"),
});

export type UploadResumeInput = z.infer<typeof uploadResumeSchema>;
export type TailorRequestInput = z.infer<typeof tailorRequestSchema>;
