import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { encryptJson, decryptJson } from "@/lib/encryption";
import { smtpSettingsSchema, apiKeysSchema, outreachSettingsSchema } from "@/lib/validators/settings";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        smtpCredentialsEncrypted: true,
        apiKeysEncrypted: true,
        dryRunEnabled: true,
        maxEmailsPerDay: true,
        tier: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let smtp = { email: "", appPassword: "", smtpHost: "smtp.gmail.com", smtpPort: 587 };
    if (profile.smtpCredentialsEncrypted) {
      try {
        const decrypted = decryptJson<any>(profile.smtpCredentialsEncrypted);
        smtp = {
          email: decrypted.email || "",
          appPassword: decrypted.appPassword ? "••••••••••••••••" : "",
          smtpHost: decrypted.smtpHost || "smtp.gmail.com",
          smtpPort: decrypted.smtpPort || 587,
        };
      } catch (e) {
        console.error("Failed to decrypt SMTP credentials:", e);
      }
    }

    let apiKeys = { groqApiKey: "", deepseekApiKey: "" };
    if (profile.apiKeysEncrypted) {
      try {
        const decrypted = decryptJson<any>(profile.apiKeysEncrypted);
        apiKeys = {
          groqApiKey: decrypted.groqApiKey ? "••••••••••••••••" : "",
          deepseekApiKey: decrypted.deepseekApiKey ? "••••••••••••••••" : "",
        };
      } catch (e) {
        console.error("Failed to decrypt API keys:", e);
      }
    }

    return NextResponse.json({
      smtp,
      apiKeys,
      tier: profile.tier,
      outreach: {
        dryRunEnabled: profile.dryRunEnabled,
        maxEmailsPerDay: profile.maxEmailsPerDay,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { smtp, apiKeys, outreach } = body;

    const profile = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};

    // 1. SMTP Credentials
    if (smtp) {
      let existingSmtp: any = {};
      if (profile.smtpCredentialsEncrypted) {
        try {
          existingSmtp = decryptJson<any>(profile.smtpCredentialsEncrypted);
        } catch (e) {
          console.error("Failed to decrypt existing SMTP:", e);
        }
      }

      const passwordSubmitted = smtp.appPassword;
      const isMasked = passwordSubmitted && (passwordSubmitted.includes("•") || passwordSubmitted.includes("*"));
      const appPassword = isMasked ? existingSmtp.appPassword : passwordSubmitted;

      const validatedSmtp = smtpSettingsSchema.safeParse({
        ...smtp,
        appPassword,
      });

      if (!validatedSmtp.success) {
        return NextResponse.json(
          { error: `SMTP Validation: ${validatedSmtp.error.issues[0].message}` },
          { status: 400 }
        );
      }

      updateData.smtpCredentialsEncrypted = encryptJson(validatedSmtp.data);
    }

    // 2. API Keys
    if (apiKeys) {
      let existingKeys: any = {};
      if (profile.apiKeysEncrypted) {
        try {
          existingKeys = decryptJson<any>(profile.apiKeysEncrypted);
        } catch (e) {
          console.error("Failed to decrypt existing API keys:", e);
        }
      }

      const groqApiKey = apiKeys.groqApiKey && (apiKeys.groqApiKey.includes("•") || apiKeys.groqApiKey.includes("*"))
        ? existingKeys.groqApiKey
        : apiKeys.groqApiKey;

      const deepseekApiKey = apiKeys.deepseekApiKey && (apiKeys.deepseekApiKey.includes("•") || apiKeys.deepseekApiKey.includes("*"))
        ? existingKeys.deepseekApiKey
        : apiKeys.deepseekApiKey;

      const validatedKeys = apiKeysSchema.safeParse({ groqApiKey, deepseekApiKey });

      if (!validatedKeys.success) {
        return NextResponse.json(
          { error: `API Keys Validation: ${validatedKeys.error.issues[0].message}` },
          { status: 400 }
        );
      }

      updateData.apiKeysEncrypted = encryptJson(validatedKeys.data);
    }

    // 3. Outreach safety settings
    if (outreach) {
      const validatedOutreach = outreachSettingsSchema.safeParse(outreach);
      if (!validatedOutreach.success) {
        return NextResponse.json(
          { error: `Outreach Validation: ${validatedOutreach.error.issues[0].message}` },
          { status: 400 }
        );
      }
      updateData.dryRunEnabled = validatedOutreach.data.dryRunEnabled;
      updateData.maxEmailsPerDay = validatedOutreach.data.maxEmailsPerDay;
    }

    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
    });

    return NextResponse.json({
      message: "Settings updated successfully",
      outreach: {
        dryRunEnabled: updatedUser.dryRunEnabled,
        maxEmailsPerDay: updatedUser.maxEmailsPerDay,
      },
    });
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
