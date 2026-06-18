"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Building2,
  MapPin,
  Cpu,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumeEditor } from "@/components/resume/resume-editor";
import { AtsScoreBadge } from "@/components/resume/ats-score-badge";
import { ChangesDiff } from "@/components/resume/changes-diff";
import { ResumePreview } from "@/components/resume/resume-preview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface TailoredResumeData {
  id: string;
  tailoredText: string;
  changesSummary: {
    keywords_added: string[];
    bullets_reworded: number;
    sections_reordered: string[];
    skills_highlighted: string[];
    summary: string;
  };
  atsScore: number;
  llmModelUsed: string | null;
  createdAt: string;
  baseResume: {
    id: string;
    name: string;
    rawText: string;
  };
  jobListing: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    source: string;
    url: string;
  };
  application: {
    id: string;
    status: string;
  };
}

export default function TailoredResumePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<TailoredResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email draft state
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/resume/tailored/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch tailored resume");
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load"
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setDraftLoading(true);

    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: data.application.id,
          recipientEmail,
          recipientName,
        }),
      });

      const emailData = await res.json();
      if (!res.ok) throw new Error(emailData.error || "Failed to generate email draft");

      toast.success("Outreach email drafted successfully!");
      setDraftOpen(false);
      router.push(`/dashboard/outreach/${emailData.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDraftLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading tailored resume...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/resumes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Resumes
          </Link>
        </Button>
        <div className="text-center py-12">
          <p className="text-destructive">{error || "Resume not found"}</p>
        </div>
      </div>
    );
  }

  const sourceColors: Record<string, string> = {
    remoteok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    naukri: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    wellfound: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/resumes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resumes
        </Link>
      </Button>

      {/* Header with ATS Score and Actions */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Tailored Resume
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {data.jobListing.title} at {data.jobListing.company}
            </span>
            {data.jobListing.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {data.jobListing.location}
              </span>
            )}
            {data.llmModelUsed && (
              <span className="flex items-center gap-1.5">
                <Cpu className="h-4 w-4" />
                {data.llmModelUsed}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                sourceColors[data.jobListing.source] || ""
              }
            >
              {data.jobListing.source}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Based on: {data.baseResume.name}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Draft Outreach Email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateDraft}>
                <DialogHeader>
                  <DialogTitle>Draft Outreach Email</DialogTitle>
                  <DialogDescription>
                    AI will compose a personalized message referencing your tailored resume highlights and this job listing.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rec-email">Recipient Email</Label>
                    <Input
                      id="rec-email"
                      type="email"
                      placeholder="recruiter@company.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rec-name">Recipient Name (Optional)</Label>
                    <Input
                      id="rec-name"
                      placeholder="Jane Doe (or Hiring Team)"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={draftLoading}>
                    {draftLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Drafting...
                      </>
                    ) : (
                      "Create Draft"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AtsScoreBadge score={data.atsScore} size="lg" />
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="preview">Preview & PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <ResumeEditor
            originalText={data.baseResume.rawText}
            tailoredText={data.tailoredText}
            tailoredResumeId={data.id}
          />
        </TabsContent>

        <TabsContent value="changes">
          <ChangesDiff changes={data.changesSummary} />
        </TabsContent>

        <TabsContent value="preview">
          <ResumePreview
            tailoredText={data.tailoredText}
            tailoredResumeId={data.id}
            jobTitle={data.jobListing.title}
            company={data.jobListing.company}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
