"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Loader2, Building2, MapPin, ExternalLink, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timeline } from "@/components/dashboard/timeline";

const STATUSES = [
  "discovered", "resume_tailored", "email_drafted", "email_sent",
  "response_received", "interview", "offer", "rejected", "withdrawn",
];

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/applications/${id}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setNotes(d.application.notes || "");
        setStatus(d.application.status);
      }
      setLoading(false);
    })();
  }, [id]);

  async function saveNotes() {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(newStatus: string) {
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      // refresh timeline
      const refreshed = await fetch(`/api/applications/${id}`);
      if (refreshed.ok) setData(await refreshed.json());
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Application not found.</p>;
  }

  const job = data.application.jobListing;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/applications"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to board
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {job.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.companyLogoUrl} alt={job.company}
              className="h-12 w-12 rounded-md border border-border/50 bg-white object-contain p-1" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border/50 bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">{job.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company}</span>
              {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />Original
              </a>
            </div>
          </div>
        </div>
        <div className="w-48">
          <Select value={status} onValueChange={changeStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            <Timeline events={data.timeline} />
          </CardContent>
        </Card>

        {/* Notes + quick actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this application..."
                rows={6}
              />
              <Button onClick={saveNotes} disabled={saving} size="sm" className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Notes
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/dashboard/resumes/tailor?jobId=${job.id}`}>Tailor Resume</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/dashboard/jobs/${job.id}`}>View Job Details</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
