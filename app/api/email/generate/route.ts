import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { generateEmail } from "@/lib/services/email-service";
import { generateEmailSchema } from "@/lib/validators/email";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = generateEmailSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { applicationId, jobId, recipientEmail, recipientName } = result.data;
    let finalApplicationId = applicationId;

    if (!finalApplicationId) {
      if (!jobId) {
        return NextResponse.json(
          { error: "Either applicationId or jobId must be provided" },
          { status: 400 }
        );
      }

      const { prisma } = await import("@/lib/db/prisma");
      // Find or create application
      let application = await prisma.application.findUnique({
        where: {
          userId_jobListingId: {
            userId: user.id,
            jobListingId: jobId,
          },
        },
      });

      if (!application) {
        application = await prisma.application.create({
          data: {
            userId: user.id,
            jobListingId: jobId,
            status: "discovered",
          },
        });
      }

      finalApplicationId = application.id;
    }

    const draft = await generateEmail(
      finalApplicationId,
      recipientEmail,
      recipientName
    );

    return NextResponse.json(draft, { status: 201 });
  } catch (error: any) {
    console.error("Failed to generate email draft:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate email draft" },
      { status: 500 }
    );
  }
}
