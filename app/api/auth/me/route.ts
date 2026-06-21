import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/auth/me
 * Returns current authenticated user's profile from our database.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        tier: true,
        dryRunEnabled: true,
        maxEmailsPerDay: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Backfill name/avatar from the Supabase auth identity (e.g. Google OAuth
    // metadata) when our DB row is missing them. This keeps the sidebar from
    // falling back to the generic "User" label and shows the user's real avatar.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const metaName =
      (meta.full_name as string) ||
      (meta.name as string) ||
      (meta.user_name as string) ||
      null;
    const metaAvatar =
      (meta.avatar_url as string) || (meta.picture as string) || null;

    const resolvedName =
      profile.name || metaName || profile.email?.split("@")[0] || "User";
    const resolvedAvatar = profile.avatarUrl || metaAvatar || null;

    // Persist the backfilled values so future loads are consistent.
    if (
      (!profile.name && resolvedName !== "User") ||
      (!profile.avatarUrl && resolvedAvatar)
    ) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(!profile.name && resolvedName !== "User"
              ? { name: resolvedName }
              : {}),
            ...(!profile.avatarUrl && resolvedAvatar
              ? { avatarUrl: resolvedAvatar }
              : {}),
          },
        });
      } catch {
        /* non-blocking: still return resolved values below */
      }
    }

    return NextResponse.json({
      ...profile,
      name: resolvedName,
      avatarUrl: resolvedAvatar,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
