"use client";

import { useState, useEffect } from "react";
import { Mail, Key, Shield, Loader2, Save, Send, Lock, Trash2, Monitor, Moon, Sun, Palette, AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [savingSafety, setSavingSafety] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [userTier, setUserTier] = useState<"free" | "pro">("free");

  // Settings State
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);

  const [groqKey, setGroqKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");

  const [dryRun, setDryRun] = useState(true);
  const [maxEmails, setMaxEmails] = useState(10);

  // Theme & Deletion State
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [sendBackup, setSendBackup] = useState(true);
  const [backupEmail, setBackupEmail] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch settings on load
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        
        setSmtpEmail(data.smtp?.email || "");
        setSmtpPassword(data.smtp?.appPassword || "");
        setSmtpHost(data.smtp?.smtpHost || "smtp.gmail.com");
        setSmtpPort(data.smtp?.smtpPort || 587);

        setGroqKey(data.apiKeys?.groqApiKey || "");
        setDeepseekKey(data.apiKeys?.deepseekApiKey || "");

        setDryRun(data.outreach?.dryRunEnabled ?? true);
        setMaxEmails(data.outreach?.maxEmailsPerDay ?? 10);
        setUserTier(data.tier || "free");
        setLoginEmail(data.email || "");
        setBackupEmail(data.email || "");
      } catch (err: any) {
        toast.error(err.message || "Failed to retrieve settings");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp: {
            email: smtpEmail,
            appPassword: smtpPassword,
            smtpHost,
            smtpPort: Number(smtpPort),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save SMTP settings");

      toast.success("SMTP Settings updated successfully");
      if (smtpPassword) {
        setSmtpPassword("••••••••••••••••");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKeys: {
            groqApiKey: groqKey,
            deepseekApiKey: deepseekKey,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save API keys");

      toast.success("API Keys updated successfully");
      if (groqKey) setGroqKey("••••••••••••••••");
      if (deepseekKey) setDeepseekKey("••••••••••••••••");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingKeys(false);
    }
  };

  const handleSaveSafety = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSafety(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outreach: {
            dryRunEnabled: dryRun,
            maxEmailsPerDay: Number(maxEmails),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save safety settings");

      toast.success("Safety settings updated successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingSafety(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await fetch("/api/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: smtpEmail,
          appPassword: smtpPassword,
          smtpHost,
          smtpPort: Number(smtpPort),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "SMTP Verification Failed");

      toast.success("SMTP connection verified successfully!");
    } catch (err: any) {
      toast.error(`SMTP Test Failed: ${err.message}`);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteEmail) return;
    
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: deleteEmail,
          sendBackup,
          backupEmail: sendBackup ? backupEmail : ""
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      
      if (sendBackup) {
        toast.success(`Account deleted. Job backup sent to ${backupEmail}.`);
      } else {
        toast.success("Account deleted successfully.");
      }
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message);
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your SMTP credentials, API keys, and outreach safety parameters.
        </p>
      </div>

      {/* SMTP Settings */}
      <Card className="relative overflow-hidden">
        {userTier === "free" && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="rounded-full bg-primary/10 p-3 mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Pro Feature</h3>
            <p className="text-sm text-muted-foreground text-center px-6 max-w-sm mt-1 mb-4">
              Upgrade to Pro to use custom SMTP credentials for unlimited email outreach.
            </p>
            <Button>Upgrade to Pro</Button>
          </div>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            SMTP / Gmail Configuration
          </CardTitle>
          <CardDescription>
            Configure SMTP credentials to dispatch outreach emails. For safety, use Google App Passwords instead of your raw master password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSmtp} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-email">Sender Email</Label>
                <Input
                  id="smtp-email"
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={smtpEmail}
                  onChange={(e) => setSmtpEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">App Password (16 chars)</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder="16-character app password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={savingSmtp}>
                {savingSmtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save SMTP Settings
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestSmtp}
                disabled={testingSmtp || !smtpEmail || !smtpPassword}
              >
                {testingSmtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Test SMTP Connection
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* API Keys */}
      <Card className="relative overflow-hidden">
        {userTier === "free" && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="rounded-full bg-primary/10 p-3 mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Pro Feature</h3>
            <p className="text-sm text-muted-foreground text-center px-6 max-w-sm mt-1 mb-4">
              Upgrade to Pro to use custom API keys for unlimited AI resume tailoring and email drafting.
            </p>
            <Button>Upgrade to Pro</Button>
          </div>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            AI / LLM API Keys
          </CardTitle>
          <CardDescription>
            Provide API Keys for Groq or DeepSeek. These enable AI tailoring and email drafts composition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveKeys} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="groq-key">Groq API Key</Label>
                <Input
                  id="groq-key"
                  type="password"
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deepseek-key">DeepSeek API Key</Label>
                <Input
                  id="deepseek-key"
                  type="password"
                  placeholder="sk-..."
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={savingKeys} className="pt-2">
              {savingKeys ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save API Keys
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Outreach Safety */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Outreach Safety Controls
          </CardTitle>
          <CardDescription>
            Safeguards preventing spam flags and accidental real-world email sends.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSafety} className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Dry Run Mode</p>
                <p className="text-xs text-muted-foreground">
                  If enabled, outreach attempts are fully generated and logged but never dispatched.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dry-run-toggle"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded cursor-pointer"
                />
                <Label htmlFor="dry-run-toggle" className="cursor-pointer">
                  {dryRun ? (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                      Dry Run Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border border-green-500/20">
                      Live Sending Allowed
                    </Badge>
                  )}
                </Label>
              </div>
            </div>
            <div className="space-y-2 max-w-[200px]">
              <Label htmlFor="max-emails">Max Emails Per Day</Label>
              <Input
                id="max-emails"
                type="number"
                min="1"
                max="50"
                value={maxEmails}
                onChange={(e) => setMaxEmails(Number(e.target.value))}
                required
              />
            </div>
            <Button type="submit" disabled={savingSafety}>
              {savingSafety ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Safety Settings
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Appearance / Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 max-w-lg">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${mounted && theme === "light" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"}`}
            >
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${mounted && theme === "dark" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"}`}
            >
              <Moon className="h-6 w-6" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${mounted && theme === "system" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"}`}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-destructive/80">
            Permanently delete your account and all associated data. You can optionally request an Excel backup of all your searched jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDeleteAccount} className="space-y-6">
            {/* Backup option toggle */}
            <div className="flex items-start space-x-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 max-w-xl">
              <input
                type="checkbox"
                id="send-backup-toggle"
                checked={sendBackup}
                onChange={(e) => {
                  setSendBackup(e.target.checked);
                  if (e.target.checked && !backupEmail) {
                    setBackupEmail(loginEmail);
                  }
                }}
                className="mt-1 h-4 w-4 accent-destructive rounded cursor-pointer"
              />
              <div className="space-y-1">
                <Label htmlFor="send-backup-toggle" className="font-semibold text-foreground cursor-pointer">
                  Email Backup of Searched Jobs
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive an Excel spreadsheet (.xlsx) containing all your searched jobs before account deletion.
                </p>
              </div>
            </div>

            {/* Custom target email for backup */}
            {sendBackup && (
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="backup-email">Send backup to email:</Label>
                <Input
                  id="backup-email"
                  type="email"
                  placeholder="name@example.com"
                  value={backupEmail}
                  onChange={(e) => setBackupEmail(e.target.value)}
                  className="border-input focus-visible:ring-primary"
                  required={sendBackup}
                />
              </div>
            )}

            {/* Deletion confirmation field */}
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="delete-email" className="text-destructive font-medium">
                Confirm Account Deletion:
              </Label>
              <p className="text-xs text-muted-foreground mb-1">
                Please type <span className="font-mono text-foreground font-semibold selection:bg-red-500/20">{loginEmail || "your login email"}</span> to confirm.
              </p>
              <Input
                id="delete-email"
                type="email"
                placeholder="Type your email here"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                className="border-destructive/30 focus-visible:ring-destructive"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={deletingAccount || deleteEmail !== loginEmail}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing Deletion...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> {sendBackup ? "Delete Account & Send Backup" : "Delete Account Permanently"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
