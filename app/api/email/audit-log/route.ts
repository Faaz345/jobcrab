import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.outreachEmail.findMany({
        where: {
          application: {
            userId: user.id,
          },
        },
        include: {
          jobListing: {
            select: {
              title: true,
              company: true,
              source: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.outreachEmail.count({
        where: {
          application: {
            userId: user.id,
          },
        },
      }),
    ]);

    return NextResponse.json({
      emails,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch audit log:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}
