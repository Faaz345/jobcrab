/**
 * Resume Service — Core business logic for resume tailoring.
 * Handles LLM calls, PDF text extraction, and PDF generation.
 */

import { complete } from "@/lib/services/llm-service";
import { interpolate } from "@/lib/prompts/loader";
import {
  RESUME_TAILOR_SYSTEM_PROMPT,
  RESUME_TAILOR_USER_PROMPT,
} from "@/lib/prompts/resume-tailor";

export interface TailorResult {
  tailoredText: string;
  changesSummary: {
    keywords_added: string[];
    bullets_reworded: number;
    sections_reordered: string[];
    skills_highlighted: string[];
    summary: string;
  };
  atsScore: number;
  llmModelUsed: string;
}

/**
 * Tailor a base resume for a specific job description using LLM.
 */
export async function tailorResume(
  baseResumeText: string,
  jobDescription: string,
  userKeys?: { groq?: string; deepseek?: string }
): Promise<TailorResult> {
  const userPrompt = interpolate(RESUME_TAILOR_USER_PROMPT, {
    baseResume: baseResumeText,
    jobDescription: jobDescription,
  });

  const response = await complete({
    messages: [
      { role: "system", content: RESUME_TAILOR_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 4096,
    responseFormat: { type: "json_object" },
  }, userKeys);

  // Parse the JSON response
  let parsed;
  try {
    // Clean the response — some models wrap in markdown code blocks
    let content = response.content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    parsed = JSON.parse(content);
  } catch {
    console.error("Failed to parse LLM response:", response.content);
    throw new Error(
      "Failed to parse AI response. The model returned invalid JSON."
    );
  }

  return {
    tailoredText: parsed.tailored_text || parsed.tailoredText || baseResumeText,
    changesSummary: parsed.changes_summary || parsed.changesSummary || {
      keywords_added: [],
      bullets_reworded: 0,
      sections_reordered: [],
      skills_highlighted: [],
      summary: "No changes summary available.",
    },
    atsScore: parsed.ats_score ?? parsed.atsScore ?? 0,
    llmModelUsed: `${response.provider}/${response.model}`,
  };
}

/**
 * Extract text content from a PDF buffer.
 * Uses pdf-parse (pure JS, no native deps).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Dynamic import — pdf-parse v2 exports a named PDFParse class
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

/**
 * Generate a simple PDF from tailored resume text.
 * Uses jsPDF for pure JS PDF generation.
 */
export async function generatePdf(
  tailoredText: string,
  candidateName?: string
): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 25;
  const lineHeight = 6;

  // Title / Name
  if (candidateName) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(candidateName, pageWidth / 2, y, { align: "center" });
    y += 12;
  }

  // Process the resume text line by line
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const lines = tailoredText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }

    // Section headers (ALL CAPS or lines ending with :)
    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length > 2 &&
      trimmed.length < 60 &&
      /[A-Z]/.test(trimmed)
    ) {
      y += 4;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(trimmed, margin, y);
      y += 2;
      // Draw a thin line under section headers
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      const bulletText = trimmed.replace(/^[•\-*]\s*/, "");
      const wrappedLines = doc.splitTextToSize(`• ${bulletText}`, maxWidth - 5);
      for (const wl of wrappedLines) {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(wl, margin + 5, y);
        y += lineHeight;
      }
      continue;
    }

    // Empty lines
    if (trimmed === "") {
      y += 3;
      continue;
    }

    // Regular text — wrap to page width
    const wrappedLines = doc.splitTextToSize(trimmed, maxWidth);
    for (const wl of wrappedLines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(wl, margin, y);
      y += lineHeight;
    }
  }

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
