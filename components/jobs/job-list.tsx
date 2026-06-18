"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Bookmark, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "./job-card";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salaryRange: string | null;
  source: string;
  url: string;
  tags: string[];
  isBookmarked: boolean;
  scrapedAt: string;
}

interface JobListProps {
  initialJobs?: Job[];
  streamedJobs?: Job[];
}

export function JobList({ initialJobs = [], streamedJobs = [] }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [searchText, setSearchText] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Merge streamed jobs into the list
  useEffect(() => {
    if (streamedJobs.length > 0) {
      setJobs((prev) => {
        const existingIds = new Set(prev.map((j) => j.id));
        const newJobs = streamedJobs.filter((j) => !existingIds.has(j.id));
        return [...newJobs, ...prev];
      });
    }
  }, [streamedJobs]);

  // Load jobs from API
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchText) params.set("search", searchText);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (bookmarkedOnly) params.set("bookmarked", "true");
      params.set("limit", "50");

      const res = await fetch(`/api/jobs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [searchText, sourceFilter, bookmarkedOnly]);

  // Refresh on filter change (but not on initial mount if we have initialJobs)
  useEffect(() => {
    if (initialJobs.length === 0 && streamedJobs.length === 0) {
      fetchJobs();
    }
  }, [sourceFilter, bookmarkedOnly]); // eslint-disable-line

  // Handle bookmark toggle
  async function handleBookmark(id: string, isBookmarked: boolean) {
    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, isBookmarked } : j))
    );

    try {
      await fetch(`/api/jobs/${id}/bookmark`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBookmarked }),
      });
    } catch {
      // Revert on failure
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, isBookmarked: !isBookmarked } : j))
      );
    }
  }

  // Client-side filtering
  const filteredJobs = jobs.filter((job) => {
    if (searchText) {
      const q = searchText.toLowerCase();
      const matchesSearch =
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.location?.toLowerCase().includes(q) ?? false);
      if (!matchesSearch) return false;
    }
    if (sourceFilter !== "all" && job.source !== sourceFilter) return false;
    if (bookmarkedOnly && !job.isBookmarked) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Text search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by title, company, or location..."
            className="pl-10"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Source filter */}
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="remoteok">RemoteOK</SelectItem>
            <SelectItem value="naukri">Naukri</SelectItem>
            <SelectItem value="wellfound">Wellfound</SelectItem>
          </SelectContent>
        </Select>

        {/* Bookmark toggle */}
        <Button
          variant={bookmarkedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
          className="gap-2"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Bookmarked
        </Button>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
        </p>
      </div>

      {/* Job grid */}
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            {jobs.length === 0
              ? "No jobs discovered yet. Start a search above!"
              : "No jobs match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} onBookmark={handleBookmark} />
          ))}
        </div>
      )}
    </div>
  );
}
