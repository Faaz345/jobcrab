import { z } from "zod/v4";

export const smtpSettingsSchema = z.object({
  email: z.email("Please enter a valid Gmail address"),
  appPassword: z
    .string()
    .min(16, "App password must be 16 characters")
    .max(16, "App password must be 16 characters"),
  smtpHost: z.string().default("smtp.gmail.com"),
  smtpPort: z.number().int().default(587),
});

export const apiKeysSchema = z.object({
  groqApiKey: z.string().optional(),
  deepseekApiKey: z.string().optional(),
});

export const outreachSettingsSchema = z.object({
  dryRunEnabled: z.boolean(),
  maxEmailsPerDay: z.number().int().min(1).max(50),
});

export type SmtpSettingsInput = z.infer<typeof smtpSettingsSchema>;
export type ApiKeysInput = z.infer<typeof apiKeysSchema>;
export type OutreachSettingsInput = z.infer<typeof outreachSettingsSchema>;
