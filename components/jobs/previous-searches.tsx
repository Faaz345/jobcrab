"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface SessionRow {
  id: string;
  query: string;
  sources: string[];
  status: string;
  totalResults: number;
  startedAt: string;
  completedAt: string | null;
  sourceCounts: Record<string, number>;
}

interface PreviousSearchesProps {
  onSelectSession: (sessionId: string) => void;
}

export function PreviousSearches({ onSelectSession }: PreviousSearchesProps) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function fmt(dt: string) {
    return new Date(dt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const statusIcon = (s: string) =>
    s === "completed" ? (
      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
    ) : s === "failed" ? (
      <XCircle className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="h-4 w-4" />
          Previous Jobs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Previous Searches</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No previous searches yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSession(s.id);
                  setOpen(false);
                }}
                className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{s.query}</span>
                      {statusIcon(s.status)}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {fmt(s.startedAt)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.sources.map((src) => (
                        <Badge key={src} variant="secondary" className="text-xs">
                          {src}: {s.sourceCounts[src] ?? 0}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold">{s.totalResults}</div>
                    <div className="text-xs text-muted-foreground">jobs</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
