"use client";

import { useEffect, useState } from "react";
import { Loader2, Briefcase } from "lucide-react";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import type { AppCard } from "@/components/dashboard/kanban-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const data = await res.json();
          setApps(data.applications || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every application through your pipeline. Drag cards to update status.
        </p>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-2.5 rounded-xl border border-border/50 bg-muted/20 p-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applications tracked"
          description="Bookmark a job, tailor a resume, or send an email and it will appear here."
        >
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/jobs">Start by Finding Jobs</a>
          </Button>
        </EmptyState>
      ) : (
        <KanbanBoard initialApps={apps} />
      )}
    </div>
  );
}
