"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Loader2, Sparkles } from "lucide-react";

import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { searchQuerySchema, type SearchQueryInput } from "@/lib/validators/jobs";

const SOURCES = [
  { id: "linkedin", label: "LinkedIn", description: "Global jobs worldwide" },
  { id: "remoteok", label: "RemoteOK", description: "Remote jobs worldwide" },
  { id: "naukri", label: "Naukri", description: "Indian job market" },
  { id: "wellfound", label: "Wellfound", description: "Startup jobs" },
] as const;

interface JobSearchFormProps {
  onSearch: (data: SearchQueryInput) => void;
  isSearching: boolean;
}

const LIMIT_OPTIONS = [10, 20, 30, 50, 100] as const;

export function JobSearchForm({ onSearch, isSearching }: JobSearchFormProps) {
  const [selectedSources, setSelectedSources] = useState<string[]>(["remoteok"]);
  const [limit, setLimit] = useState<number>(20);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchQueryInput>({
    resolver: zodResolver(searchQuerySchema),
    defaultValues: {
      query: "",
      sources: ["remoteok"],
      limit: 20,
      pages: 3,
    },
  });

  function toggleSource(sourceId: string) {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((s) => s !== sourceId)
        : [...prev, sourceId]
    );
  }

  function onSubmit(data: SearchQueryInput) {
    if (selectedSources.length === 0) return;
    onSearch({
      query: data.query,
      sources: selectedSources as SearchQueryInput["sources"],
      limit,
      pages: data.pages ?? 3,
    });
  }

  function onInvalid(errs: unknown) {
    // Surface validation errors so the submit never fails silently
    console.error("[JobSearchForm] validation failed:", errs);
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          {/* Natural language search input */}
          <div className="space-y-2">
            <Label htmlFor="query" className="flex items-center gap-2 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Search with AI
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="query"
                placeholder='Try: "Senior React developer in Bangalore" or "Remote Python jobs"'
                className="pl-10 text-base"
                {...register("query")}
              />
            </div>
            {errors.query && (
              <p className="text-xs text-destructive">{errors.query.message}</p>
            )}
          </div>

          {/* Source selection */}
          <div className="space-y-3">
            <Label className="text-sm">Job Sources</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SOURCES.map((source) => (
                <label
                  key={source.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 ${
                    selectedSources.includes(source.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <Checkbox
                    checked={selectedSources.includes(source.id)}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                  <div>
                    <div className="text-sm font-medium">{source.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {source.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {selectedSources.length === 0 && (
              <p className="text-xs text-destructive">
                Select at least one source
              </p>
            )}
          </div>

          {/* Number of jobs to scrape */}
          <div className="space-y-3">
            <Label className="text-sm">Number of jobs to fetch (per source)</Label>
            <div className="flex flex-wrap gap-2">
              {LIMIT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLimit(opt)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    limit === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isSearching || selectedSources.length === 0}
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search Jobs
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
