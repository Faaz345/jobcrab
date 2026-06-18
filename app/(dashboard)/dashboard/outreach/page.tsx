"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, Loader2, ArrowRight, Trash2, HelpCircle } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuditLogTable, AuditLogEmail } from "@/components/outreach/audit-log-table";
import { toast } from "sonner";
import Link from "next/link";

export default function OutreachPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<AuditLogEmail[]>([]);
  const [activeTab, setActiveTab] = useState("drafts");

  // Load outreach history
  const loadOutreach = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/email/audit-log?limit=100");
      if (!res.ok) throw new Error("Failed to load outreach history");
      const data = await res.json();
      setEmails(data.emails || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutreach();
  }, []);

  const drafts = emails.filter((e) => e.status === "drafted");
  const auditLogs = emails.filter((e) => e.status !== "drafted");

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this draft?")) return;

    try {
      const res = await fetch(`/api/email/${id}/skip`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive draft");
      toast.success("Draft archived successfully");
      loadOutreach();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outreach</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your personalized cold email outreach and safety compliance audit logs.
          </p>
        </div>
        <Link href="/dashboard/jobs">
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Find Jobs to Message
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="drafts">
            Active Drafts ({drafts.length})
          </TabsTrigger>
          <TabsTrigger value="audit">
            Audit Trail ({auditLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="space-y-4">
          {drafts.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No active drafts"
              description="Create a draft directly from a job detail page or a tailored resume workspace."
            >
              <Link href="/dashboard/jobs">
                <Button variant="outline" size="sm">
                  <Mail className="mr-2 h-4 w-4" />
                  Browse Jobs
                </Button>
              </Link>
            </EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <Card
                  key={draft.id}
                  className="hover:border-primary/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  onClick={() => router.push(`/dashboard/outreach/${draft.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-sm font-semibold truncate max-w-[200px]">
                          {draft.recipientName || "Hiring Team"}
                        </CardTitle>
                        <CardDescription className="text-xxs truncate max-w-[200px]">
                          {draft.recipientEmail}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-medium text-primary line-clamp-1 mb-1">
                        {draft.jobListing.company}
                      </div>
                      <div className="text-xxs text-muted-foreground line-clamp-1 mb-2">
                        {draft.jobListing.title}
                      </div>
                      <div className="text-xs italic text-muted-foreground border-l-2 pl-2 line-clamp-2">
                        &ldquo;{draft.subject}&rdquo;
                      </div>
                    </div>
                    <div className="flex justify-end pt-3 border-t">
                      <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
                        Edit & Send <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable
            emails={auditLogs}
            onView={(id) => router.push(`/dashboard/outreach/${id}`)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
