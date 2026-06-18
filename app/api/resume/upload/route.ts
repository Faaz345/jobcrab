import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/services/resume-service";

/**
 * POST /api/resume/upload
 * Upload a base resume — either as PDF file (multipart) or text paste (JSON).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let name: string;
    let rawText: string;
    let filePath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle PDF file upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      name = (formData.get("name") as string) || "Uploaded Resume";
      const isDefault = formData.get("isDefault") === "true";

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Validate file type
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Only PDF files are accepted" },
          { status: 400 }
        );
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size must be under 5MB" },
          { status: 400 }
        );
      }

      // Extract text from PDF
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      rawText = await extractTextFromPdf(buffer);

      if (!rawText || rawText.trim().length < 50) {
        return NextResponse.json(
          {
            error:
              "Could not extract sufficient text from the PDF. Try pasting the text directly.",
          },
          { status: 400 }
        );
      }

      // If setting as default, unset other defaults first
      if (isDefault) {
        await prisma.baseResume.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      const resume = await prisma.baseResume.create({
        data: {
          userId: user.id,
          name,
          rawText: rawText.trim(),
          filePath,
          isDefault,
        },
      });

      return NextResponse.json(resume, { status: 201 });
    } else {
      // Handle JSON text paste
      const body = await req.json();
      name = body.name;
      rawText = body.rawText;
      const isDefault = body.isDefault ?? false;

      if (!name || !rawText) {
        return NextResponse.json(
          { error: "Name and rawText are required" },
          { status: 400 }
        );
      }

      if (rawText.trim().length < 50) {
        return NextResponse.json(
          { error: "Resume text must be at least 50 characters" },
          { status: 400 }
        );
      }

      // If setting as default, unset other defaults first
      if (isDefault) {
        await prisma.baseResume.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      const resume = await prisma.baseResume.create({
        data: {
          userId: user.id,
          name,
          rawText: rawText.trim(),
          isDefault,
        },
      });

      return NextResponse.json(resume, { status: 201 });
    }
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload resume" },
      { status: 500 }
    );
  }
}
