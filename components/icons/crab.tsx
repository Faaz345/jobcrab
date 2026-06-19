import * as React from "react";

export function CrabIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 18h.01" />
      <path d="M15 18h.01" />
      <path d="M9 18h.01" />
      <path d="M6 14s.5-2 3-2 3 2 3 2" />
      <path d="M12 14s.5-2 3-2 3 2 3 2" />
      <path d="M19.5 7A2.5 2.5 0 0 1 22 9.5" />
      <path d="M4.5 7A2.5 2.5 0 0 0 2 9.5" />
      <path d="M19 12c-1.5 0-2.5-.5-3-1" />
      <path d="M5 12c1.5 0 2.5-.5 3-1" />
      <path d="M21 16c-1.5 0-2.5-.5-3-1" />
      <path d="M3 16c1.5 0 2.5-.5 3-1" />
      <path d="M19 20c-1.5 0-2.5-.5-3-1" />
      <path d="M5 20c1.5 0 2.5-.5 3-1" />
      <rect width="12" height="6" x="6" y="9" rx="3" />
      <circle cx="8" cy="7" r="1" />
      <circle cx="16" cy="7" r="1" />
      <path d="M8 8V4" />
      <path d="M16 8V4" />
    </svg>
  );
}
