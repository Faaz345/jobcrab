"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Loader2, FileDown, Lock } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
  const [isPro, setIsPro] = useState(false);
  const [isLoadingTier, setIsLoadingTier] = useState(true);
  const resumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.tier === "pro") {
          setIsPro(true);
        }
        setIsLoadingTier(false);
      })
      .catch(() => {
        setIsLoadingTier(false);
      });
  }, []);

  async function handleDownloadPdf() {
    if (!isPro) return;
    setIsGenerating(true);
    
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = resumeRef.current;
      
      if (!element) {
        throw new Error("Resume element not found");
      }

      // Temporarily make the hidden container visible for html2pdf to capture properly
      const previousDisplay = element.style.display;
      element.style.display = "block";

      const opt = {
        margin: 10, // mm
        filename: `resume_${company?.replace(/\s+/g, "_") || "tailored"}_${jobTitle?.replace(/\s+/g, "_") || "resume"}.pdf`,
        image: { type: "jpeg" as const, quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm" as const, format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
      
      // Revert visibility
      element.style.display = previousDisplay;
      toast.success("PDF downloaded successfully!");

    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error("Failed to generate PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Parse Markdown to HTML
  const rawHtml = marked.parse(tailoredText) as string;
  const safeHtml = DOMPurify.sanitize(rawHtml);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileDown className="h-4 w-4" />
              Premium PDF Export
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Download your beautifully styled resume as an A4 PDF.
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {!isLoadingTier && !isPro && (
              <Badge variant="secondary" className="px-3 py-1 text-xs">
                <Lock className="h-3 w-3 mr-1" /> Pro Feature
              </Badge>
            )}
            
            {isLoadingTier ? (
              <Button disabled size="sm" variant="outline">
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Checking...
              </Button>
            ) : isPro ? (
              <Button
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                size="sm"
                variant="primary"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download PDF
                  </>
                )}
              </Button>
            ) : (
              <Button size="sm" variant="default" asChild>
                <Link href="/dashboard/pricing">
                  Upgrade to Pro
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Visual Web Preview (just plain text or basic styles to match old behavior, or styled) */}
        <div className="mx-auto max-w-[800px] rounded-lg border bg-white p-8 shadow-sm prose prose-sm max-w-none text-zinc-800"
             dangerouslySetInnerHTML={{ __html: safeHtml }}
        />

        {/* Hidden A4-sized element specifically structured for PDF generation */}
        {/* We use inline styles heavily here to ensure html2canvas captures it perfectly */}
        <div className="overflow-hidden h-0 w-0 absolute">
          <div 
            ref={resumeRef} 
            style={{
              display: "none",
              width: "794px", /* A4 width at 96 DPI */
              padding: "40px",
              backgroundColor: "white",
              color: "#1f2937",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: "14px",
              lineHeight: "1.5",
              boxSizing: "border-box"
            }}
          >
            {/* We inject custom CSS into the hidden div to style the markdown exactly how we want it */}
            <style dangerouslySetInnerHTML={{__html: `
              .premium-resume h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; text-align: center; color: #111827; }
              .premium-resume h2 { font-size: 18px; font-weight: 700; text-transform: uppercase; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; color: #374151; letter-spacing: 0.05em; }
              .premium-resume h3 { font-size: 16px; font-weight: 600; margin-top: 16px; margin-bottom: 4px; color: #111827; }
              .premium-resume h4 { font-size: 14px; font-weight: 600; margin-top: 12px; margin-bottom: 4px; font-style: italic; color: #4b5563; }
              .premium-resume p { margin-bottom: 8px; }
              .premium-resume ul { padding-left: 20px; margin-bottom: 16px; }
              .premium-resume li { margin-bottom: 4px; }
              .premium-resume strong { font-weight: 600; color: #111827; }
              .premium-resume em { font-style: italic; }
            `}} />
            <div className="premium-resume" dangerouslySetInnerHTML={{ __html: safeHtml }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
