"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { JobSearchForm } from "@/components/jobs/job-search-form";
import { ScrapeProgress } from "@/components/jobs/scrape-progress";
import { JobList } from "@/components/jobs/job-list";
import { PreviousSearches } from "@/components/jobs/previous-searches";
import { ScraperStatusBanner } from "@/components/shared/scraper-status-banner";
import type { SearchQueryInput } from "@/lib/validators/jobs";

export default function JobsPage() {
  const [isSearching, setIsSearching] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamedJobs, setStreamedJobs] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function handleSearch(data: SearchQueryInput) {
    setIsSearching(true);
    setSearchError(null);
    setStreamedJobs([]);

    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setSearchError(body.error || "Failed to start search");
        setIsSearching(false);
        return;
      }

      const result = await res.json();
      setSessionId(result.sessionId);
    } catch {
      setSearchError("Failed to connect to the server");
      setIsSearching(false);
    }
  }

  const handleComplete = useCallback(() => {
    setIsSearching(false);
  }, []);

  async function handleSelectSession(sessionId: string) {
    setIsSearching(false);
    setSessionId(null);
    setSearchError(null);
    try {
      const res = await fetch(`/api/jobs/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setStreamedJobs(data.jobs || []);
      }
    } catch {
      setSearchError("Failed to load previous search");
    }
  }

  const handleJobsUpdate = useCallback((newJobs: any[]) => {
    setStreamedJobs((prev) => [...prev, ...newJobs]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Discovery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search across multiple job boards using AI-powered natural language queries
          </p>
        </div>
        <PreviousSearches onSelectSession={handleSelectSession} />
      </div>

      <ScraperStatusBanner />

      {/* Search form */}
      <JobSearchForm onSearch={handleSearch} isSearching={isSearching} />

      {/* Error message */}
      {searchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {searchError}
        </div>
      )}

      {/* Progress bar (shows during active scraping) */}
      {sessionId && isSearching && (
        <ScrapeProgress
          sessionId={sessionId}
          onComplete={handleComplete}
          onJobsUpdate={handleJobsUpdate}
        />
      )}

      {/* Job results */}
      <JobList streamedJobs={streamedJobs} />
    </div>
  );
}
