import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getApplications } from "@/lib/services/application-service";
import type { ApplicationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as ApplicationStatus | null;
  const source = searchParams.get("source");
  const search = searchParams.get("search");

  const applications = await getApplications(user.id, {
    status: status || undefined,
    source: source || undefined,
    search: search || undefined,
  });
  return NextResponse.json({ applications });
}