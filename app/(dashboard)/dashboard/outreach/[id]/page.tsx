"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mail, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailComposer } from "@/components/outreach/email-composer";
import { EmailPreview } from "@/components/outreach/email-preview";
import { SendControls } from "@/components/outreach/send-controls";
import { toast } from "sonner";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EmailDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // Email state
  const [email, setEmail] = useState<any>(null);
  
  // Settings & Safety counters
  const [dryRun, setDryRun] = useState(true);
  const [maxEmails, setMaxEmails] = useState(10);
  const [sentToday, setSentToday] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch email details
      const emailRes = await fetch(`/api/email/${id}`);
      if (!emailRes.ok) {
        if (emailRes.status === 404) {
          toast.error("Email draft not found");
          router.push("/dashboard/outreach");
          return;
        }
        throw new Error("Failed to load email draft");
      }
      const emailData = await emailRes.json();
      setEmail(emailData);

      // Fetch settings
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setDryRun(settingsData.outreach?.dryRunEnabled ?? true);
        setMaxEmails(settingsData.outreach?.maxEmailsPerDay ?? 10);
      }

      // Fetch sent today count
      const historyRes = await fetch("/api/email/audit-log?limit=100");
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const emailsList = historyData.emails || [];
        const todayStr = new Date().toDateString();
        const sentCount = emailsList.filter((e: any) => {
          if (e.status !== "sent" || e.isDryRun || !e.sentAt) return false;
          return new Date(e.sentAt).toDateString() === todayStr;
        }).length;
        setSentToday(sentCount);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFieldChange = (fields: any) => {
    setEmail((prev: any) => ({
      ...prev,
      ...fields,
      // If bodyPlain is updated, sync a simple paragraph HTML for preview
      bodyHtml: fields.bodyPlain
        ? fields.bodyPlain
            .split("\n\n")
            .map((p: string) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
            .join("")
        : prev.bodyHtml,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/email/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: email.recipientEmail,
          recipientName: email.recipientName,
          subject: email.subject,
          bodyPlain: email.bodyPlain,
          bodyHtml: email.bodyHtml,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save draft");

      toast.success("Draft saved successfully");
      setEmail(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      // First auto-save changes
      const saveRes = await fetch(`/api/email/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: email.recipientEmail,
          recipientName: email.recipientName,
          subject: email.subject,
          bodyPlain: email.bodyPlain,
          bodyHtml: email.bodyHtml,
        }),
      });
      if (!saveRes.ok) throw new Error("Failed to auto-save changes before sending");

      // Trigger safety-send
      const sendRes = await fetch(`/api/email/${id}/send`, { method: "POST" });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || "Failed to send email");

      if (sendData.isDryRun) {
        toast.success("Simulation complete! Check the audit trail logs.");
      } else {
        toast.success("Email sent successfully!");
      }

      router.push("/dashboard/outreach");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      const res = await fetch(`/api/email/${id}/skip`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive email");
      toast.success("Email draft archived");
      router.push("/dashboard/outreach");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSkipping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!email) return null;

  const isReadOnly = email.status !== "drafted";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/outreach")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isReadOnly ? "Outreach Details" : "Compose Outreach Email"}
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Review and configure your outreach to <strong>{email.jobListing?.company}</strong> for the <strong>{email.jobListing?.title}</strong> role.
          </p>
        </div>
      </div>

      {isReadOnly && (
        <Card className="border bg-muted/40">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {email.status === "sent" ? (
                email.isDryRun ? (
                  <>
                    <ShieldAlert className="h-5 w-5 text-yellow-600" />
                    Dry Run Logged
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Sent via SMTP
                  </>
                )
              ) : email.status === "failed" ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Delivery Failed
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  Archived / Skipped
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>
              <strong>Recipient:</strong> {email.recipientName || "Hiring Team"} ({email.recipientEmail})
            </div>
            {email.sentAt && (
              <div>
                <strong>Timestamp:</strong> {new Date(email.sentAt).toLocaleString()}
              </div>
            )}
            {email.smtpMessageId && (
              <div>
                <strong>SMTP Message ID:</strong> <span className="font-mono">{email.smtpMessageId}</span>
              </div>
            )}
            {email.errorMessage && (
              <div className="text-destructive font-semibold">
                <strong>Error Details:</strong> {email.errorMessage}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Composer Left Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Template Content</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailComposer
                recipientEmail={email.recipientEmail}
                recipientName={email.recipientName || ""}
                subject={email.subject}
                bodyPlain={email.bodyPlain}
                onChange={handleFieldChange}
                disabled={isReadOnly}
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview & Controls Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Safety Checklist & Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {isReadOnly ? (
                <div className="text-xs text-muted-foreground italic">
                  This outreach record is read-only because it has already been processed (sent/skipped/failed).
                </div>
              ) : (
                <SendControls
                  onSend={handleSend}
                  onSkip={handleSkip}
                  onSave={handleSave}
                  sending={sending}
                  skipping={skipping}
                  saving={saving}
                  dryRunEnabled={dryRun}
                  maxEmailsPerDay={maxEmails}
                  sentTodayCount={sentToday}
                />
              )}
            </CardContent>
          </Card>

          <EmailPreview bodyHtml={email.bodyHtml} />
        </div>
      </div>
    </div>
  );
}
