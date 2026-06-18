"use client";

import { useState } from "react";
import { Download, Loader2, FileDown } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResumePreviewProps {
  tailoredText: string;
  tailoredResumeId: string;
  jobTitle?: string;
  company?: string;
}

export function ResumePreview({
  tailoredText,
  tailoredResumeId,
  jobTitle,
  company,
}: ResumePreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleDownloadPdf() {
    setIsGenerating(true);
    try {
      const res = await fetch(
        `/api/resume/tailored/${tailoredResumeId}/pdf`,
        { method: "POST" }
      );

      if (!res.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume_${company?.replace(/\s+/g, "_") || "tailored"}_${jobTitle?.replace(/\s+/g, "_") || "resume"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileDown className="h-4 w-4" />
            Resume Preview
          </CardTitle>
          <Button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* A4-like preview */}
        <div className="mx-auto max-w-[650px] rounded-lg border bg-white p-8 shadow-sm">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-800">
            {tailoredText}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
