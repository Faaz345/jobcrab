"use client";

/**
 * Supabase does not require a provider wrapper — session is managed
 * via server-side cookies and the middleware. This component is kept
 * as a passthrough for layout compatibility.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
