import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { skipOutreachEmail } from "@/lib/services/email-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, props: RouteContext) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const email = await prisma.outreachEmail.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!email) {
      return NextResponse.json({ error: "Email draft not found" }, { status: 404 });
    }

    if (email.application.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const skippedEmail = await skipOutreachEmail(id);
    return NextResponse.json(skippedEmail);
  } catch (error: any) {
    console.error("Failed to skip outreach email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to skip outreach email" },
      { status: 500 }
    );
  }
}
