"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle, XCircle, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ScrapeProgressProps {
  sessionId: string;
  onComplete: () => void;
  onJobsUpdate: (jobs: any[]) => void;
}

export function ScrapeProgress({
  sessionId,
  onComplete,
  onJobsUpdate,
}: ScrapeProgressProps) {
  const [status, setStatus] = useState<string>("running");
  const [totalJobs, setTotalJobs] = useState(0);
  const [progress, setProgress] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(
      `/api/jobs/search/${sessionId}/stream`
    );
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.total_jobs !== undefined) {
          setTotalJobs(data.total_jobs);
          // Simulate progress based on jobs found
          setProgress(Math.min(95, data.total_jobs * 5));
        }

        if (data.new_jobs?.length) {
          onJobsUpdate(data.new_jobs);
        }

        if (data.completed || data.status === "completed") {
          setStatus("completed");
          setProgress(100);
          es.close();
          onComplete();
        }

        if (data.status === "failed") {
          setStatus("failed");
          es.close();
          onComplete();
        }

        if (data.status) {
          setStatus(data.status);
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      setStatus("failed");
      es.close();
      onComplete();
    };

    return () => {
      es.close();
    };
  }, [sessionId, onComplete, onJobsUpdate]);

  const statusConfig = {
    running: {
      icon: <Loader2 className="h-5 w-5 animate-spin text-blue-400" />,
      label: "Scraping in progress...",
      color: "from-blue-500/20 to-cyan-500/20",
      barColor: "bg-blue-500",
    },
    completed: {
      icon: <CheckCircle className="h-5 w-5 text-green-400" />,
      label: "Scraping complete!",
      color: "from-green-500/20 to-emerald-500/20",
      barColor: "bg-green-500",
    },
    failed: {
      icon: <XCircle className="h-5 w-5 text-red-400" />,
      label: "Scraping failed",
      color: "from-red-500/20 to-orange-500/20",
      barColor: "bg-red-500",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.running;

  return (
    <Card className={`border-border/50 bg-gradient-to-r ${config.color}`}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          {config.icon}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{config.label}</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                <span>{totalJobs} jobs found</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className={`h-full rounded-full ${config.barColor} transition-all duration-700 ease-out`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
