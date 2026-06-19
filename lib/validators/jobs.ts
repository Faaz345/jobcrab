import { z } from "zod/v4";

export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(3, "Search query must be at least 3 characters")
    .max(500, "Search query must be at most 500 characters"),
  sources: z
    .array(z.enum(["naukri", "remoteok", "wellfound", "linkedin"]))
    .min(1, "Select at least one job source"),
  limit: z.number().int().min(5).max(100),
  pages: z.number().int().min(1).max(10),
});

export const bookmarkSchema = z.object({
  isBookmarked: z.boolean(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type BookmarkInput = z.infer<typeof bookmarkSchema>;

