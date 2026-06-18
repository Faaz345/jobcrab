"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  FileText,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResumeCard } from "@/components/resume/resume-card";
import { AtsScoreBadge } from "@/components/resume/ats-score-badge";

interface BaseResume {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  rawText: string;
  _count: { tailoredResumes: number };
}

interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string | null;
  source: string;
}

function TailorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("job");

  const [resumes, setResumes] = useState<BaseResume[]>([]);
  const [job, setJob] = useState<JobListing | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTailoring, setIsTailoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch resumes
      const resumeRes = await fetch("/api/resume/base");
      if (resumeRes.ok) {
        const data = await resumeRes.json();
        setResumes(data);
        // Auto-select default resume
        const defaultResume = data.find(
          (r: BaseResume) => r.isDefault
        );
        if (defaultResume) {
          setSelectedResumeId(defaultResume.id);
        }
      }

      // Fetch job if ID provided
      if (jobId) {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          setJob(jobData);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleTailor() {
    if (!selectedResumeId || !jobId) return;

    setIsTailoring(true);
    setError(null);

    try {
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobListingId: jobId,
          baseResumeId: selectedResumeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Tailoring failed");
      }

      // Redirect to the tailored resume page
      router.push(`/dashboard/resumes/tailored/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tailoring failed");
      setIsTailoring(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-16 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-semibold">No Job Selected</h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Go to your Jobs page and click &quot;Tailor Resume&quot; on a job
            listing to get started.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/jobs">Browse Jobs</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/jobs/${jobId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tailor Resume
        </h1>
        {job && (
          <p className="mt-1 text-muted-foreground">
            Tailoring for{" "}
            <span className="font-medium text-foreground">
              {job.title}
            </span>{" "}
            at{" "}
            <span className="font-medium text-foreground">
              {job.company}
            </span>
          </p>
        )}
      </div>

      {/* Job Context Card */}
      {job && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{job.title}</h3>
              <p className="text-sm text-muted-foreground">
                {job.company}
                {job.location && ` · ${job.location}`}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {job.source}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Resume Picker */}
      {resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-semibold">
            No Base Resumes Found
          </h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Upload a base resume first before tailoring it for a job.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/resumes">Upload Resume</Link>
          </Button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="mb-3 text-lg font-semibold">
              Select a Base Resume
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  onDelete={() => {}}
                  onSetDefault={() => {}}
                  onSelect={setSelectedResumeId}
                  isSelected={selectedResumeId === resume.id}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Tailor Button */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              onClick={handleTailor}
              disabled={!selectedResumeId || isTailoring}
              className="min-w-[240px] bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
            >
              {isTailoring ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  AI is Tailoring Your Resume...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Tailor Resume with AI
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TailorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TailorContent />
    </Suspense>
  );
}
