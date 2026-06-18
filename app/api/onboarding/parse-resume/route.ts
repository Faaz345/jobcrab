import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { complete } from "@/lib/services/llm-service";
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

    // Use custom LLM service to extract structured data
    const prompt = `Extract the following resume details from this text and return ONLY a JSON object with these exact keys:
- "title": string (Current or target job title)
- "experience": number (Total years of experience)
- "location": string (Current location or 'Remote')
- "education": string (A summary of education and degrees)
- "skills": string (A comma-separated string of top skills)
- "workHistory": string (A summary of recent 1-2 work experiences and achievements)

If a field is missing, make your best guess or return an empty string/0.

Resume Text:
${text.substring(0, 5000)}`;

    const response = await complete({
      messages: [
        { role: "system", content: "You are an expert resume parser. Always return valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      responseFormat: { type: "json_object" }
    });

    let parsed;
    try {
      let content = response.content.trim();
      if (content.startsWith("\`\`\`")) {
        content = content.replace(/^\`\`\`(?:json)?\n?/, "").replace(/\n?\`\`\`$/, "");
      }
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse LLM JSON output", response.content);
      throw new Error("Invalid JSON from LLM");
    }

    return NextResponse.json({
      title: parsed.title || "",
      experience: typeof parsed.experience === "number" ? parsed.experience : parseInt(parsed.experience || "0"),
      location: parsed.location || "",
      education: parsed.education || "",
      skills: parsed.skills || "",
      workHistory: parsed.workHistory || ""
    });
  } catch (error: any) {
    console.error("Error parsing resume:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
