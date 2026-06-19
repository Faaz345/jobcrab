import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import nodemailer from "nodemailer";
import { decryptJson } from "@/lib/encryption";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

export async function DELETE(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, sendBackup, backupEmail } = await request.json();

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

    if (sendBackup) {
      const targetEmail = backupEmail?.trim() || user.email;

      // 2. Fetch all user's job listings
      const jobs = await prisma.jobListing.findMany({
        where: { userId: user.id },
        orderBy: { scrapedAt: 'desc' },
      });

      // 3. Generate Excel file buffer
      let excelBuffer: Buffer | null = null;
      if (jobs.length > 0) {
        const formattedJobs = jobs.map((j) => ({
          Role: j.title,
          Company: j.company,
          Location: j.location || "N/A",
          Source: j.source,
          "Date Posted": j.postedAt ? new Date(j.postedAt).toLocaleDateString() : "N/A",
          "Searched At": new Date(j.scrapedAt).toLocaleDateString(),
          URL: j.url,
        }));
        const worksheet = XLSX.utils.json_to_sheet(formattedJobs);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Searched Jobs");
        excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      }

      // 4. Format jobs into an email with Professional JobCrab UI
      const logoHtml = `<div style="text-align: center; margin-bottom: 20px;"><img src="cid:logo" alt="JobCrab Logo" width="120" style="width: 120px; max-width: 100%; height: auto;" /></div>`;
      
      let bodyHtml = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 12px;">
          ${logoHtml}
          <div style="background-color: #161b22; padding: 30px; border-radius: 8px; border: 1px solid #30363d;">
            <h2 style="color: #FD101A; margin-top: 0; text-align: center;">Account Deleted & Data Backup</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #c9d1d9;">
              Hi there,
            </p>
            <p style="font-size: 16px; line-height: 1.5; color: #c9d1d9;">
              Your JobCrab account (<strong style="color: #FD101A;">${user.email}</strong>) has been successfully deleted. We're sorry to see you go!
            </p>
            <p style="font-size: 16px; line-height: 1.5; color: #c9d1d9;">
              As requested, we have attached a backup of all the jobs you searched during your time with us.
            </p>
      `;

      if (jobs.length === 0) {
        bodyHtml += `
            <div style="background-color: #0d1117; border-left: 4px solid #8b949e; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #8b949e;">You didn't have any searched jobs saved in your account.</p>
            </div>
        `;
      } else {
        bodyHtml += `
            <div style="background-color: #1f2428; border: 1px solid #30363d; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 18px; color: #FD101A; font-weight: bold;">
                ${jobs.length} Jobs Backed Up
              </p>
              <p style="margin: 0; font-size: 14px; color: #8b949e;">
                Please find the professional Excel spreadsheet attached to this email containing your full search history and application links.
              </p>
            </div>
        `;
      }

      bodyHtml += `
            <hr style="border: 0; border-top: 1px solid #30363d; margin: 30px 0;" />
            <p style="font-size: 12px; color: #8b949e; text-align: center; margin: 0;">
              This email was sent automatically by JobCrab. Your data has now been permanently erased from our servers.
            </p>
          </div>
        </div>
      `;

      // 5. Send email via SMTP (Custom first, fallback to Global)
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

      // Prepare attachments
      const attachments: any[] = [];
      
      // Add JobCrab Logo as inline attachment
      try {
        const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
        if (fs.existsSync(logoPath)) {
          attachments.push({
            filename: "logo.png",
            path: logoPath,
            cid: "logo", // same cid value as in the HTML img src
          });
        }
      } catch (e) {
        console.warn("Could not load logo for email attachment", e);
      }

      // Add Excel backup if there are jobs
      if (excelBuffer) {
        attachments.push({
          filename: "JobCrab_Backup.xlsx",
          content: excelBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      }

      try {
        await transporter.sendMail({
          from: `"JobCrab" <${smtpConfig.email}>`,
          to: targetEmail,
          subject: "Your JobCrab Account Deletion & Data Backup",
          html: bodyHtml,
          attachments,
        });
      } catch (err: any) {
        return NextResponse.json({ error: `Failed to send backup email: ${err.message}. Deletion aborted.` }, { status: 500 });
      }
    }

    // 6. Cascade delete from Prisma (deletes Resumes, Applications, Scrape Sessions, Jobs, Logs)
    await prisma.user.delete({
      where: { id: user.id },
    });

    // 7. Hard delete from Supabase Auth (if Service Role Key exists)
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
