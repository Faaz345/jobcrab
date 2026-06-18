import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, experience, location, education, skills, workHistory } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const prompt = `
    You are an expert resume writer. Generate a professional Markdown resume based on the following details.
    Do NOT include any pleasantries or conversational text. Output ONLY the raw Markdown resume.

    Name: ${user.email} (placeholder name)
    Title: ${title}
    Experience: ${experience} years
    Location: ${location}
    Education: ${education}
    Skills: ${skills}
    Work History: ${workHistory}

    Make it look professional with standard resume sections: Summary, Skills, Experience, Education.
    `;

    // Try OpenAI, fallback to basic template if API fails or key is missing
    let markdownResume = "";
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
      });
      markdownResume = text;
    } catch (aiError) {
      console.warn("AI Generation failed, falling back to basic template", aiError);
      markdownResume = `# ${user.email}\n## ${title}\n**Location:** ${location} | **Experience:** ${experience} years\n\n## Summary\nProfessional with ${experience} years of experience as a ${title}.\n\n## Skills\n${skills}\n\n## Experience\n${workHistory}\n\n## Education\n${education}`;
    }

    // Wrap in a transaction to ensure both operations succeed
    await prisma.$transaction([
      prisma.baseResume.create({
        data: {
          userId: user.id,
          name: "Generated Resume - " + new Date().toLocaleDateString(),
          rawText: markdownResume,
          isDefault: true,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { isOnboarded: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
