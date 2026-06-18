import { describe, it, expect } from "vitest";
import { searchQuerySchema } from "@/lib/validators/jobs";
import { updateStatusSchema, updateNotesSchema } from "@/lib/validators/application";

describe("searchQuerySchema", () => {
  it("accepts a valid query", () => {
    const result = searchQuerySchema.safeParse({
      query: "Backend Developer",
      sources: ["remoteok"],
      limit: 20,
      pages: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a query shorter than 3 chars", () => {
    const result = searchQuerySchema.safeParse({
      query: "ab",
      sources: ["remoteok"],
      limit: 20,
      pages: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty sources array", () => {
    const result = searchQuerySchema.safeParse({
      query: "Backend Developer",
      sources: [],
      limit: 20,
      pages: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid source", () => {
    const result = searchQuerySchema.safeParse({
      query: "Backend Developer",
      sources: ["linkedin"],
      limit: 20,
      pages: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a limit above the max", () => {
    const result = searchQuerySchema.safeParse({
      query: "Backend Developer",
      sources: ["remoteok"],
      limit: 500,
      pages: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateStatusSchema", () => {
  it("accepts a valid status", () => {
    expect(updateStatusSchema.safeParse({ status: "interview" }).success).toBe(true);
  });
  it("rejects an unknown status", () => {
    expect(updateStatusSchema.safeParse({ status: "ghosted" }).success).toBe(false);
  });
});

describe("updateNotesSchema", () => {
  it("accepts notes within the length limit", () => {
    expect(updateNotesSchema.safeParse({ notes: "Followed up by email." }).success).toBe(true);
  });
  it("rejects notes over 5000 chars", () => {
    expect(updateNotesSchema.safeParse({ notes: "x".repeat(5001) }).success).toBe(false);
  });
});