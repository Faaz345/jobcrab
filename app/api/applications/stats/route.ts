import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getStats } from "@/lib/services/application-service";

export async function GET() {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stats = await getStats(user.id);
  return NextResponse.json({
    ...stats,
    user_tier: user.user_metadata?.tier || "free",
  });
}