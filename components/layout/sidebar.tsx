"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { LayoutGridIcon } from "@/components/icons/layout-grid";
import { SearchIcon } from "@/components/icons/search";
import { FolderOpenIcon } from "@/components/icons/folder-open";
import { MailIcon } from "@/components/icons/mail";
import { FolderIcon } from "@/components/icons/folder";
import { ZapIcon } from "@/components/icons/zap";
import { SettingsIcon } from "@/components/icons/settings";
import { LogoutIcon } from "@/components/icons/logout";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGridIcon },
  { label: "Jobs", href: "/dashboard/jobs", icon: SearchIcon },
  { label: "Resumes", href: "/dashboard/resumes", icon: FolderOpenIcon },
  { label: "Outreach", href: "/dashboard/outreach", icon: MailIcon },
  { label: "Applications", href: "/dashboard/applications", icon: FolderIcon },
  { label: "Pricing", href: "/dashboard/pricing", icon: ZapIcon },
  { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

const BOUNCY = "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";

function SidebarItem({ item, isActive, isCollapsed, onClick }: { item: any; isActive: boolean; isCollapsed: boolean; onClick?: () => void }) {
  const iconRef = useRef<any>(null);

  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium overflow-hidden whitespace-nowrap",
        BOUNCY,
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <div 
        className={cn("flex shrink-0 items-center justify-center", BOUNCY)}
        style={{ width: isCollapsed ? '48px' : '44px', height: '40px' }}
      >
        <item.icon ref={iconRef} className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
      </div>
      <span 
        className={cn(
          BOUNCY,
          isCollapsed ? "opacity-0 w-0 -translate-x-4" : "opacity-100 w-auto translate-x-0"
        )}
      >
        {item.label}
      </span>
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="ml-2">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: { isOpen?: boolean; onClose?: () => void; isCollapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<"free" | "pro">("free");
  const logoutIconRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((profile) => {
        if (profile && !profile.error) {
          setUserName(profile.name || "User");
          setUserEmail(profile.email || "user@example.com");
          setUserAvatar(profile.avatarUrl || null);
          setUserTier(profile.tier || "free");
        }
      })
      .catch((err) => console.error("Failed to load profile", err));
  }, []);

  const userInitial = userName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar overflow-hidden lg:translate-x-0",
      BOUNCY,
      isOpen ? "translate-x-0" : "-translate-x-full",
      isCollapsed ? "w-[72px]" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-5 overflow-hidden whitespace-nowrap shrink-0">
        <Link href="/" className="flex items-center">
          <div 
            className={cn("flex items-center overflow-hidden", BOUNCY)}
            style={{ width: isCollapsed ? '32px' : '160px' }}
          >
            <Image 
              src="/images/logo.png" 
              alt="JobCrab Logo" 
              width={160} height={40} 
              className={cn(
                "h-8 min-w-[160px] origin-left", 
                BOUNCY,
                isCollapsed ? "object-left object-cover scale-100" : "object-left object-contain scale-[1.75]"
              )} 
            />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-hidden">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return <SidebarItem key={item.href} item={item} isActive={isActive} isCollapsed={isCollapsed} onClick={onClose} />;
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 hidden lg:block border-t border-border/50 shrink-0">
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex w-full items-center justify-center rounded-lg border border-border/50 bg-background/50 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:border-sidebar-accent-foreground/20 shadow-sm transition-colors overflow-hidden",
            BOUNCY
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 shrink-0", BOUNCY, isCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* User Footer */}
      <div className="border-t border-border p-2 shrink-0">
        <div className={cn("flex items-center rounded-lg relative h-12 overflow-hidden whitespace-nowrap px-3", BOUNCY, isCollapsed ? "gap-0" : "gap-3")}>
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary shrink-0">
            {userAvatar ? (
              <Image src={userAvatar} alt={userName} width={32} height={32} className="rounded-full object-cover" />
            ) : (
              userInitial
            )}
            {isCollapsed && userTier === "pro" && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-black ring-2 ring-sidebar shadow-sm">
                ★
              </span>
            )}
          </div>
          
          <div className={cn("flex-1 flex flex-col justify-center", BOUNCY, isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">
                {userName}
              </p>
              {userTier === "pro" && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                  Pro
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {userEmail}
            </p>
          </div>
          
          <button
            onMouseEnter={() => logoutIconRef.current?.startAnimation?.()}
            onMouseLeave={() => logoutIconRef.current?.stopAnimation?.()}
            onClick={handleSignOut}
            className={cn(
              "rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 flex items-center justify-center",
              BOUNCY,
              isCollapsed ? "opacity-0 w-0 p-0 scale-50" : "opacity-100 w-8 h-8 p-1.5 scale-100"
            )}
            title="Sign out"
          >
            <LogoutIcon ref={logoutIconRef} className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
