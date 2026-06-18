import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, props: RouteContext) {
  try {
    const authUser = await getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const email = await prisma.outreachEmail.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            jobListing: true,
          },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email draft not found" }, { status: 404 });
    }

    if (email.application.userId !== authUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(email);
  } catch (error: any) {
    console.error("Failed to fetch email draft:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email draft" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, props: RouteContext) {
  try {
    const authUser = await getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();

    const email = await prisma.outreachEmail.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!email) {
      return NextResponse.json({ error: "Email draft not found" }, { status: 404 });
    }

    if (email.application.userId !== authUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { subject, bodyHtml, bodyPlain, recipientEmail, recipientName } = body;

    const updated = await prisma.outreachEmail.update({
      where: { id },
      data: {
        subject: subject ?? email.subject,
        bodyHtml: bodyHtml ?? email.bodyHtml,
        bodyPlain: bodyPlain ?? email.bodyPlain,
        recipientEmail: recipientEmail ?? email.recipientEmail,
        recipientName: recipientName ?? email.recipientName,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update email draft:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update email draft" },
      { status: 500 }
    );
  }
}
