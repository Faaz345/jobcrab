import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { processAutoApply } from "@/lib/services/auto-apply-service";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobListingId, baseResumeId } = body;

    if (!jobListingId) {
      return NextResponse.json(
        { error: "jobListingId is required" },
        { status: 400 }
      );
    }

    const result = await processAutoApply({
      userId: user.id,
      jobListingId,
      baseResumeId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Auto Apply Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to auto-apply" },
      { status: 500 }
    );
  }
}
