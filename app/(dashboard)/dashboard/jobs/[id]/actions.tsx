"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  FileText,
  Mail,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface JobDetailActionsProps {
  jobId: string;
  isBookmarked: boolean;
  jobUrl: string;
}

export function JobDetailActions({
  jobId,
  isBookmarked: initialBookmarked,
  jobUrl,
}: JobDetailActionsProps) {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  // Draft inputs
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");

  async function handleBookmark() {
    setBookmarkLoading(true);
    const newState = !isBookmarked;
    setIsBookmarked(newState);

    try {
      await fetch(`/api/jobs/${jobId}/bookmark`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBookmarked: newState }),
      });
    } catch {
      setIsBookmarked(!newState);
    } finally {
      setBookmarkLoading(false);
    }
  }

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    setDraftLoading(true);

    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          recipientEmail,
          recipientName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate email draft");

      toast.success("Outreach email drafted successfully!");
      setDraftOpen(false);
      router.push(`/dashboard/outreach/${data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDraftLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={handleBookmark} variant="outline" disabled={bookmarkLoading}>
        {isBookmarked ? (
          <>
            <BookmarkCheck className="mr-2 h-4 w-4 text-amber-400" />
            Bookmarked
          </>
        ) : (
          <>
            <Bookmark className="mr-2 h-4 w-4" />
            Bookmark
          </>
        )}
      </Button>

      <Button variant="outline" asChild>
        <Link href={`/dashboard/resumes/tailor?job=${jobId}`}>
          <FileText className="mr-2 h-4 w-4" />
          Tailor Resume
        </Link>
      </Button>

      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Draft Email
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateDraft}>
            <DialogHeader>
              <DialogTitle>Draft Outreach Email</DialogTitle>
              <DialogDescription>
                AI will compose a personalized message referencing your tailored resume highlights and this job listing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rec-email">Recipient Email</Label>
                <Input
                  id="rec-email"
                  type="email"
                  placeholder="recruiter@company.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rec-name">Recipient Name (Optional)</Label>
                <Input
                  id="rec-name"
                  placeholder="Jane Doe (or Hiring Team)"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={draftLoading}>
                {draftLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Drafting...
                  </>
                ) : (
                  "Create Draft"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button variant="outline" asChild>
        <a href={jobUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          View Original
        </a>
      </Button>
    </div>
  );
}
