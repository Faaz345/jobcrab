"use client";

import React, { useState } from "react";

import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MapPin,
  Building2,
  DollarSign,
  FileText,
  Mail,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    salaryRange: string | null;
    source: string;
    companyLogoUrl?: string | null;
    url: string;
    tags: string[];
    isBookmarked: boolean;
    scrapedAt: string;
  };
  onBookmark: (id: string, isBookmarked: boolean) => void;
  onDelete?: (id: string) => void;
}

const sourceColors: Record<string, string> = {
  remoteok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  naukri: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  wellfound: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const decodeHTML = (str: string) => {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'");
};

export function JobCard({ job, onBookmark, onDelete }: JobCardProps) {
  const sourceStyle = sourceColors[job.source] || "bg-muted text-muted-foreground";

  const [isApplying, setIsApplying] = useState(false);

  const handleAutoApply = async () => {
    setIsApplying(true);
    try {
      const res = await fetch("/api/applications/auto-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobListingId: job.id }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to auto apply");
      
      alert(`Successfully auto-applied! Email drafted to ${data.targetEmail}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="group border-border/50 bg-card transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-black/5">
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          {/* Company logo */}
          <Link
            href={`/dashboard/jobs/${job.id}`}
            className="shrink-0"
          >
            {job.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.companyLogoUrl}
                alt={job.company}
                className="h-11 w-11 rounded-md border border-border/50 bg-white object-contain p-0.5"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border/50 bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/jobs/${job.id}`}
              className="text-base font-semibold leading-tight text-foreground hover:text-primary transition-colors line-clamp-2"
            >
              {decodeHTML(job.title)}
            </Link>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{decodeHTML(job.company)}</span>
              </span>
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{job.location}</span>
                </span>
              )}
              {job.salaryRange && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 shrink-0" />
                  <span>{job.salaryRange}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => onBookmark(job.id, !job.isBookmarked)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={job.isBookmarked ? "Unbookmark" : "Bookmark"}
            >
              {job.isBookmarked ? (
                <BookmarkCheck className="h-5 w-5 text-amber-400" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
            
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to remove this job?")) {
                    onDelete(job.id);
                  }
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Remove Job"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        {job.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
            {job.tags.length > 5 && (
              <Badge variant="secondary" className="text-xs font-normal">
                +{job.tags.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <Badge variant="outline" className={`text-xs ${sourceStyle}`}>
            {job.source}
          </Badge>

          <div className="flex items-center gap-1">
            <Button 
              variant="primary" 
              size="sm" 
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0" 
              onClick={handleAutoApply}
              disabled={isApplying}
            >
              {isApplying ? "Applying..." : "Auto Apply ⚡"}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <Link href={`/dashboard/jobs/${job.id}`}>
                <FileText className="mr-1 h-3.5 w-3.5" />
                Details
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Original
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
