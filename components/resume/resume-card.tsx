"use client";

import { useState } from "react";
import {
  FileText,
  Star,
  Trash2,
  MoreVertical,
  Calendar,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BaseResumeData {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  rawText: string;
  _count: {
    tailoredResumes: number;
  };
}

interface ResumeCardProps {
  resume: BaseResumeData;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export function ResumeCard({
  resume,
  onDelete,
  onSetDefault,
  onSelect,
  isSelected,
}: ResumeCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/resume/base/${resume.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete(resume.id);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSetDefault() {
    try {
      await fetch(`/api/resume/base/${resume.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      onSetDefault(resume.id);
    } catch (err) {
      console.error("Failed to set default:", err);
    }
  }

  const previewText = resume.rawText.slice(0, 200).replace(/\n/g, " ");

  return (
    <Card
      className={`group relative transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : ""
      } ${onSelect ? "cursor-pointer" : ""}`}
      onClick={() => onSelect?.(resume.id)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold">{resume.name}</h3>
                {resume.isDefault && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]"
                  >
                    <Star className="mr-1 h-3 w-3" />
                    Default
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(resume.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {resume._count.tailoredResumes} tailored
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!resume.isDefault && (
                <DropdownMenuItem onClick={handleSetDefault}>
                  <Star className="h-4 w-4" />
                  Set as Default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Text preview */}
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {previewText}...
        </p>
      </CardContent>
    </Card>
  );
}
