import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /auth/callback
 * Supabase OAuth callback handler.
 * Exchanges the auth code for a session, then ensures the user
 * profile exists in our database (for Google sign-ups).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Ensure a profile row exists in our users table
      await prisma.user.upsert({
        where: { id: data.user.id },
        create: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "User",
          avatarUrl: data.user.user_metadata?.avatar_url,
        },
        update: {
          // Keep name/avatar in sync with Google profile
          name: data.user.user_metadata?.name,
          avatarUrl: data.user.user_metadata?.avatar_url,
        },
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to the login page with an error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
