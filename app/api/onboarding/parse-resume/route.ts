import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
const pdfParse = require("pdf-parse");

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Use AI to extract structured data
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        title: z.string().describe("The person's current or target job title"),
        experience: z.number().describe("Total years of experience (number)"),
        location: z.string().describe("Current location or 'Remote'"),
        education: z.string().describe("A summary string of their education and degrees"),
        skills: z.string().describe("A comma-separated string of their top skills"),
        workHistory: z.string().describe("A summary of their recent 1-2 work experiences and achievements"),
      }),
      prompt: `Extract the following resume details from this text. If a field is missing, make your best guess or return an empty string/0.\n\nResume Text:\n${text.substring(0, 5000)}`,
    });

    return NextResponse.json(object);
  } catch (error: any) {
    console.error("Error parsing resume:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
