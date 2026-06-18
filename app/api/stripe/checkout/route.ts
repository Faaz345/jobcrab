import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since we are not actually wiring up Stripe yet,
    // we'll simulate a successful payment by just upgrading the user instantly.
    
    // In a real implementation:
    // 1. Create a Stripe Checkout Session
    // 2. Return { url: session.url }
    // 3. User pays -> Stripe Webhook -> Update Prisma
    
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: "pro" },
    });

    return NextResponse.json({ success: true, message: "Upgraded to Pro" });
  } catch (error: any) {
    console.error("Error in checkout:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
