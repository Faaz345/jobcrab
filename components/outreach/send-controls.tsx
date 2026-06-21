"use client";

import { ShieldAlert, Send, SkipForward, Save, Loader2 } from "lucide-react";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";

interface SendControlsProps {
  onSend: () => void;
  onSkip: () => void;
  onSave: () => void;
  sending: boolean;
  skipping: boolean;
  saving: boolean;
  dryRunEnabled: boolean;
  maxEmailsPerDay?: number;
  sentTodayCount?: number;
}

export function SendControls({
  onSend,
  onSkip,
  onSave,
  sending,
  skipping,
  saving,
  dryRunEnabled,
  maxEmailsPerDay = 10,
  sentTodayCount = 0,
}: SendControlsProps) {
  const percentage = Math.min((sentTodayCount / maxEmailsPerDay) * 100, 100);

  return (
    <div className="space-y-4">
      {dryRunEnabled && (
        <div className="flex gap-3 p-4 rounded-lg border bg-yellow-500/10 border-yellow-500/20 text-yellow-800 dark:text-yellow-400">
          <ShieldAlert className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="space-y-1">
            <h5 className="font-semibold text-sm leading-none tracking-tight">Dry Run Mode is Enabled</h5>
            <div className="text-xs opacity-90">
              Your email will be processed, checked for safety compliance, and logged to the history audit trail, but **no real email will be dispatched**. Disable this in Settings for live outreach.
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
        {/* Daily limits progress bar */}
        {!dryRunEnabled && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Daily Volume Safety Limit</span>
              <span>
                {sentTodayCount} of {maxEmailsPerDay} emails sent today
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  percentage >= 90 ? "bg-red-500" : percentage >= 70 ? "bg-yellow-500" : "bg-primary"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <Button
            onClick={onSend}
            disabled={sending || skipping || saving}
            className="w-full sm:flex-1 sm:min-w-[150px] bg-green-600 hover:bg-green-700 text-white"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> {dryRunEnabled ? "Run Send Simulation" : "Send Outreach Email"}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onSave}
            disabled={sending || skipping || saving}
            className="w-full sm:flex-1 sm:min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Draft
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={sending || skipping || saving}
            className="w-full sm:flex-1 sm:min-w-[120px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            {skipping ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Archiving...
              </>
            ) : (
              <>
                <SkipForward className="h-4 w-4" /> Skip / Archive
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
