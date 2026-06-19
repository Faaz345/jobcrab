"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function ScraperStatusBanner() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/scraper-health", { cache: "no-store" });
        const data = await res.json();
        if (active) setOnline(!!data.online);
      } catch {
        if (active) setOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (online !== false) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Search service is offline. Start it with{" "}
        <code className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs">npm run dev:all</code>{" "}
        to search for jobs.
      </span>
    </div>
  );
}
