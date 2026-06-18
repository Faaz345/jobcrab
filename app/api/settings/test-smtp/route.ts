import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { decryptJson } from "@/lib/encryption";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { email, appPassword, smtpHost, smtpPort } = body;

    // Retrieve user to check existing credentials if masked
    const profile = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { smtpCredentialsEncrypted: true },
    });

    if (appPassword && (appPassword.includes("•") || appPassword.includes("*"))) {
      if (profile?.smtpCredentialsEncrypted) {
        try {
          const decrypted = decryptJson<any>(profile.smtpCredentialsEncrypted);
          appPassword = decrypted.appPassword;
        } catch (e) {
          return NextResponse.json(
            { error: "Could not retrieve existing credentials for test." },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "No existing credentials found to test." },
          { status: 400 }
        );
      }
    }

    if (!email || !appPassword) {
      return NextResponse.json(
        { error: "Email and App Password are required to test." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost || "smtp.gmail.com",
      port: smtpPort || 587,
      secure: smtpPort === 465,
      auth: {
        user: email,
        pass: appPassword,
      },
    } as any);

    // We can override auth with direct credentials
    transporter.set("auth", {
      user: email,
      pass: appPassword,
    });

    await transporter.verify();

    return NextResponse.json({ success: true, message: "SMTP Connection successful!" });
  } catch (error: any) {
    console.error("SMTP verification failed:", error);
    return NextResponse.json(
      { error: error.message || "Connection verification failed." },
      { status: 500 }
    );
  }
}
