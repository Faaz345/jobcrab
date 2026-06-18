"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Search, FileText, Mail, RefreshCw, Briefcase, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { AdvancedAnalytics } from "@/components/dashboard/advanced-analytics";
import { StatsSkeleton } from "@/components/shared/loading-skeletons";

const activityIcon = (entityType: string) => {
  if (entityType === "job") return <Search className="h-4 w-4 text-blue-400" />;
  if (entityType === "resume") return <FileText className="h-4 w-4 text-purple-400" />;
  if (entityType === "email") return <Mail className="h-4 w-4 text-amber-400" />;
  return <RefreshCw className="h-4 w-4 text-emerald-400" />;
};

function activityLabel(a: any): string {
  const m = a.metadata || {};
  if (a.entityType === "resume") return `Tailored resume${m.company ? ` for ${m.company}` : ""}`;
  if (a.entityType === "email") return `Email ${a.action}${m.recipient ? ` to ${m.recipient}` : ""}`;
  if (a.entityType === "application") return `Status -> ${m.to ?? "updated"}`;
  if (a.entityType === "job") return "Job activity";
  return `${a.entityType} ${a.action}`;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([
          fetch("/api/applications/stats").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/applications/activity").then((r) => (r.ok ? r.json() : { activity: [] })),
        ]);
        setStats(s);
        setActivity(a.activity || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your job search at a glance.
        </p>
      </div>

      {loading || !stats ? (
        <StatsSkeleton />
      ) : (
        <>
          <StatsCards stats={stats} />

          {stats.total === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No applications yet. Find jobs to get started.
                </p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/jobs">Find Jobs <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <AnalyticsCharts byStatus={stats.by_status} bySource={stats.by_source} />
              <AdvancedAnalytics stats={stats} isPro={stats.user_tier === "pro"} />
            </>
          )}

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 text-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        {activityIcon(a.entityType)}
                      </span>
                      <span className="flex-1">{activityLabel(a)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
