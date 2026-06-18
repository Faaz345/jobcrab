"use client";

import { Calendar, CheckCircle2, XCircle, AlertTriangle, Eye, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";

export interface AuditLogEmail {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: "drafted" | "sent" | "skipped" | "failed";
  isDryRun: boolean;
  sentAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  jobListing: {
    title: string;
    company: string;
    source: string;
  };
}

interface AuditLogTableProps {
  emails: AuditLogEmail[];
  onView?: (emailId: string) => void;
}

export function AuditLogTable({ emails, onView }: AuditLogTableProps) {
  const getStatusBadge = (email: AuditLogEmail) => {
    if (email.status === "sent") {
      if (email.isDryRun) {
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" /> Dry Run Simulated
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" /> Sent Successfully
        </Badge>
      );
    }
    if (email.status === "failed") {
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" /> Send Failed
        </Badge>
      );
    }
    if (email.status === "skipped") {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground border flex items-center gap-1 w-fit">
          Skipped / Archived
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1 w-fit">
        Draft
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-card text-center">
        <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
        <h3 className="font-semibold text-sm">No outreach history found</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
          Simulate or send your first outreach email to see an audit trail here.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Job Context</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            {onView && <TableHead className="text-right">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((email) => (
            <TableRow key={email.id}>
              <TableCell className="text-xs whitespace-nowrap">
                {formatDate(email.sentAt || email.createdAt)}
              </TableCell>
              <TableCell>
                <div className="text-xs font-semibold">{email.recipientName || "Hiring Team"}</div>
                <div className="text-xxs text-muted-foreground">{email.recipientEmail}</div>
              </TableCell>
              <TableCell>
                <div className="text-xs font-semibold">{email.jobListing.company}</div>
                <div className="text-xxs text-muted-foreground">{email.jobListing.title}</div>
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-xs font-medium">
                {email.subject}
              </TableCell>
              <TableCell>{getStatusBadge(email)}</TableCell>
              {onView && (
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(email.id)}
                    title="View Email detail"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
