import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  Bookmark,
  BookmarkCheck,
  FileText,
  Mail,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { JobDetailActions } from "./actions";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user?.id) {
    notFound();
  }

  const { id } = await params;
  const job = await prisma.jobListing.findFirst({
    where: { id, userId: user.id },
  });

  if (!job) {
    notFound();
  }

  const sourceColors: Record<string, string> = {
    remoteok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    naukri: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    wellfound: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    linkedin: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {job.company}
            </span>
            {job.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
            )}
            {job.salaryRange && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                {job.salaryRange}
              </span>
            )}
            {job.scrapedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Found {new Date(job.scrapedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <Badge
          variant="outline"
          className={`text-xs ${sourceColors[job.source] || ""}`}
        >
          {job.source}
        </Badge>
      </div>

      {/* Tags */}
      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {job.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Action buttons (client component) */}
      <JobDetailActions jobId={job.id} isBookmarked={job.isBookmarked} jobUrl={job.url} />

      <Separator />

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap break-words">
            {job.description || "No description available."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
