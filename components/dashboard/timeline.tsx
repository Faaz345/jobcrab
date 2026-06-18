"use client";

import {
  Search,
  FileText,
  Mail,
  MessageSquare,
  Mic,
  PartyPopper,
  RefreshCw,
  XCircle,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  entityType: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const iconFor = (e: TimelineEvent) => {
  if (e.entityType === "job") return <Search className="h-4 w-4" />;
  if (e.entityType === "resume") return <FileText className="h-4 w-4" />;
  if (e.entityType === "email") {
    if (e.action === "skipped") return <XCircle className="h-4 w-4" />;
    return <Mail className="h-4 w-4" />;
  }
  if (e.entityType === "application") {
    const to = (e.metadata?.to as string) || "";
    if (to === "response_received") return <MessageSquare className="h-4 w-4" />;
    if (to === "interview") return <Mic className="h-4 w-4" />;
    if (to === "offer") return <PartyPopper className="h-4 w-4" />;
    return <RefreshCw className="h-4 w-4" />;
  }
  return <RefreshCw className="h-4 w-4" />;
};

function labelFor(e: TimelineEvent): string {
  const m = e.metadata || {};
  switch (e.entityType) {
    case "job":
      return "Job discovered";
    case "resume":
      return m.atsScore != null
        ? `Resume tailored (ATS ${m.atsScore})`
        : "Resume tailored";
    case "email":
      if (e.action === "sent") return `Email sent to ${m.recipient ?? "recipient"}`;
      if (e.action === "skipped") return "Email skipped";
      if (e.action === "failed") return "Email failed";
      return "Email drafted";
    case "application":
      return `Status changed: ${m.from ?? "?"} -> ${m.to ?? "?"}`;
    default:
      return `${e.entityType} ${e.action}`;
  }
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No timeline events yet.
      </p>
    );
  }
  return (
    <ol className="relative ml-3 border-l border-border">
      {events.map((e) => (
        <li key={e.id} className="mb-6 ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary ring-4 ring-background">
            {iconFor(e)}
          </span>
          <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
            <p className="text-sm font-medium">{labelFor(e)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(e.createdAt).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
