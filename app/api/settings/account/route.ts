import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import nodemailer from "nodemailer";
import { decryptJson } from "@/lib/encryption";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (email !== user.email) {
      return NextResponse.json({ error: "Email does not match your account." }, { status: 400 });
    }

    // 1. Fetch Prisma user for tier and SMTP credentials
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User data not found" }, { status: 404 });
    }

    // 2. Fetch all user's job listings
    const jobs = await prisma.jobListing.findMany({
      where: { userId: user.id },
      orderBy: { scrapedAt: 'desc' },
    });

    // 3. Format jobs into an email
    let bodyHtml = `<h2>Job Backup for ${user.email}</h2><p>Here are all the jobs you scraped on JobCrab before deleting your account.</p>`;
    
    if (jobs.length === 0) {
      bodyHtml += `<p>You did not have any saved or scraped jobs.</p>`;
    } else {
      bodyHtml += `<table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>Role</th>
            <th>Company</th>
            <th>Location</th>
            <th>Source</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map(j => `
            <tr>
              <td>${j.title}</td>
              <td>${j.company}</td>
              <td>${j.location || 'N/A'}</td>
              <td>${j.source}</td>
              <td><a href="${j.url}">Apply Link</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    }

    // 4. Send email via SMTP (Custom first, fallback to Global)
    let smtpConfig: any = null;
    if (dbUser.tier === "pro" && dbUser.smtpCredentialsEncrypted) {
      try {
        smtpConfig = decryptJson<any>(dbUser.smtpCredentialsEncrypted);
      } catch (err) {
        console.warn("Failed to decrypt custom SMTP credentials");
      }
    }

    if (!smtpConfig || !smtpConfig.email || !smtpConfig.appPassword) {
      if (!process.env.GLOBAL_SMTP_USER || !process.env.GLOBAL_SMTP_PASS) {
        return NextResponse.json({ error: "Platform SMTP is missing, and you haven't configured custom SMTP. Please configure SMTP first to receive your backup." }, { status: 400 });
      }
      smtpConfig = {
        email: process.env.GLOBAL_SMTP_USER,
        appPassword: process.env.GLOBAL_SMTP_PASS,
        smtpHost: process.env.GLOBAL_SMTP_HOST || "smtp.gmail.com",
        smtpPort: parseInt(process.env.GLOBAL_SMTP_PORT || "587", 10),
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost || "smtp.gmail.com",
      port: smtpConfig.smtpPort || 587,
      secure: smtpConfig.smtpPort === 465,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.appPassword,
      },
    } as any);

    try {
      await transporter.sendMail({
        from: `"JobCrab Backup" <${smtpConfig.email}>`,
        to: user.email,
        subject: "Your JobCrab Data Backup",
        html: bodyHtml,
      });
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to send backup email: ${err.message}. Deletion aborted.` }, { status: 500 });
    }

    // 4. Cascade delete from Prisma (deletes Resumes, Applications, Scrape Sessions, Jobs, Logs)
    await prisma.user.delete({
      where: { id: user.id },
    });

    // 5. Hard delete from Supabase Auth (if Service Role Key exists)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      } catch (adminErr) {
        console.error("Failed to delete user from Supabase Auth", adminErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Account Deletion Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
