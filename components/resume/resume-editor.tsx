"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResumeEditorProps {
  originalText: string;
  tailoredText: string;
  tailoredResumeId: string;
  onSave?: (updatedText: string) => void;
}

export function ResumeEditor({
  originalText,
  tailoredText,
  tailoredResumeId,
  onSave,
}: ResumeEditorProps) {
  const [editedText, setEditedText] = useState(tailoredText);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = editedText !== tailoredText;

  async function handleSave() {
    setIsSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/resume/tailored/${tailoredResumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailoredText: editedText }),
      });

      if (res.ok) {
        setSaved(true);
        onSave?.(editedText);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Original (read-only) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Original Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-y-auto rounded-lg bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground">
              {originalText}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Tailored (editable) */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-primary">
              ✨ AI-Tailored Resume
            </CardTitle>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-xs text-emerald-400">✓ Saved</span>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                variant={hasChanges ? "default" : "outline"}
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[600px] resize-none font-mono text-sm leading-relaxed"
          />
        </CardContent>
      </Card>
    </div>
  );
}
