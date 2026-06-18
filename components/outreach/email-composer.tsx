"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EmailComposerProps {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyPlain: string;
  onChange: (fields: {
    recipientEmail?: string;
    recipientName?: string;
    subject?: string;
    bodyPlain?: string;
  }) => void;
  disabled?: boolean;
}

export function EmailComposer({
  recipientEmail,
  recipientName,
  subject,
  bodyPlain,
  onChange,
  disabled = false,
}: EmailComposerProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recipient-email">Recipient Email</Label>
          <Input
            id="recipient-email"
            type="email"
            value={recipientEmail}
            onChange={(e) => onChange({ recipientEmail: e.target.value })}
            disabled={disabled}
            placeholder="hiring.manager@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipient-name">Recipient Name</Label>
          <Input
            id="recipient-name"
            type="text"
            value={recipientName}
            onChange={(e) => onChange({ recipientName: e.target.value })}
            disabled={disabled}
            placeholder="Jane Doe (or Hiring Team)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject Line</Label>
        <Input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          disabled={disabled}
          placeholder="Application for Software Engineer"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Email Body (Plain Text)</Label>
        <Textarea
          id="body"
          value={bodyPlain}
          onChange={(e) => onChange({ bodyPlain: e.target.value })}
          disabled={disabled}
          placeholder="Dear Jane, I am writing to express my interest in..."
          className="min-h-[350px] font-sans text-sm leading-relaxed"
          required
        />
      </div>
    </div>
  );
}
