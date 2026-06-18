"use client";

import Link from "next/link";
import { Building2, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AppCard {
  id: string;
  status: string;
  updatedAt: string;
  jobListing: {
    id: string;
    title: string;
    company: string;
    source: string;
    companyLogoUrl?: string | null;
  };
}

const sourceColors: Record<string, string> = {
  remoteok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  naukri: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  wellfound: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

function daysSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function KanbanCard({ app, dragging }: { app: AppCard; dragging?: boolean }) {
  const src = sourceColors[app.jobListing.source] || "bg-muted text-muted-foreground";
  return (
    <div
      className={`rounded-lg border bg-card p-3 shadow-sm transition-shadow ${
        dragging ? "border-primary shadow-lg" : "border-border/60 hover:border-border"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {app.jobListing.companyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.jobListing.companyLogoUrl}
            alt={app.jobListing.company}
            className="h-8 w-8 shrink-0 rounded border border-border/50 bg-white object-contain p-0.5"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border/50 bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-tight">
            {app.jobListing.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {app.jobListing.company}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <Badge variant="outline" className={`text-[10px] ${src}`}>
          {app.jobListing.source}
        </Badge>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {daysSince(app.updatedAt)}
        </span>
      </div>
      <Link
        href={`/dashboard/applications/${app.id}`}
        className="mt-2 flex items-center justify-center gap-1 rounded-md border border-border/50 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <FileText className="h-3 w-3" /> View
      </Link>
    </div>
  );
}
