"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Upload, Plus } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ResumeUpload } from "@/components/resume/resume-upload";
import { ResumeCard } from "@/components/resume/resume-card";

interface BaseResume {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  rawText: string;
  _count: {
    tailoredResumes: number;
  };
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<BaseResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resume/base");
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      }
    } catch (err) {
      console.error("Failed to fetch resumes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  function handleUploadSuccess() {
    setShowUpload(false);
    fetchResumes();
  }

  function handleDelete(id: string) {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSetDefault(id: string) {
    setResumes((prev) =>
      prev.map((r) => ({
        ...r,
        isDefault: r.id === id,
      }))
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="mt-1 text-muted-foreground">
            Upload your base resume and create AI-tailored versions for each
            job.
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? (
            <>Hide Upload</>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Upload Resume
            </>
          )}
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <ResumeUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Resume List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border bg-muted/30"
            />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes uploaded"
          description="Upload your base resume to start tailoring it for specific job descriptions using AI."
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Your First Resume
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}
    </div>
  );
}
