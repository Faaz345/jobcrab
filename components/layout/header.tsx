"use client";

import { Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "@/components/icons/search";
import { NotificationsBell } from "@/components/layout/notifications-bell";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 flex-1 max-w-md">
        {/* Menu button on mobile */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden animate-fade-in"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search bar */}
        <div className="relative w-full">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs, resumes, applications..."
            className="h-9 w-full rounded-lg border-muted bg-muted/50 pl-9 text-sm focus:bg-background"
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        <NotificationsBell />
      </div>
    </header>
  );
}
