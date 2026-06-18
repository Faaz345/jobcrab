import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import Razorpay from "razorpay";

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      // Dummy response if keys aren't set yet (for local testing without keys)
      return NextResponse.json({
        id: "order_dummy_" + Date.now(),
        amount: 99900,
        currency: "INR",
      });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: 99900, // ₹999.00
      currency: "INR",
      receipt: `receipt_${user.id}`,
    };

    const order = await instance.orders.create(options);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
