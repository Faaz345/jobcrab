"use client";

import { Plus, Minus, ArrowUpDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChangesSummary {
  keywords_added: string[];
  bullets_reworded: number;
  sections_reordered: string[];
  skills_highlighted: string[];
  summary: string;
}

interface ChangesDiffProps {
  changes: ChangesSummary;
}

export function ChangesDiff({ changes }: ChangesDiffProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Changes Made
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground">{changes.summary}</p>

        {/* Keywords Added */}
        {changes.keywords_added.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              Keywords Added
            </div>
            <div className="flex flex-wrap gap-1.5">
              {changes.keywords_added.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Skills Highlighted */}
        {changes.skills_highlighted.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              Skills Highlighted
            </div>
            <div className="flex flex-wrap gap-1.5">
              {changes.skills_highlighted.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bullets Reworded */}
        {changes.bullets_reworded > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Minus className="h-3.5 w-3.5 text-amber-400" />
            <span>
              <span className="font-medium text-amber-400">
                {changes.bullets_reworded}
              </span>{" "}
              bullet points reworded
            </span>
          </div>
        )}

        {/* Sections Reordered */}
        {changes.sections_reordered.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ArrowUpDown className="h-3.5 w-3.5 text-purple-400" />
              Sections Reordered
            </div>
            <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
              {changes.sections_reordered.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
