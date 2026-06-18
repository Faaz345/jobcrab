"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentTier, setCurrentTier] = useState<"free" | "pro">("free");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.tier) setCurrentTier(data.user.tier);
          setUserName(data.user.name || "User");
          setUserEmail(data.user.email || "");
        }
      });
  }, []);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      // 1. Create Order
      const orderRes = await fetch("/api/razorpay/order", { method: "POST" });
      if (!orderRes.ok) throw new Error("Failed to create order");
      const order = await orderRes.json();

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_dummy", // fallback for UI testing
        amount: order.amount,
        currency: order.currency,
        name: "JobCrab",
        description: "Upgrade to JobCrab Pro",
        image: "/images/logo.png",
        order_id: order.id,
        handler: async function (response: any) {
          // 3. Verify Payment
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });

          if (!verifyRes.ok) {
            toast.error("Payment verification failed.");
            setIsUpgrading(false);
            return;
          }

          toast.success("Successfully upgraded to JobCrab Pro! 🦀🚀");
          setCurrentTier("pro");
          router.refresh();
          setIsUpgrading(false);
        },
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: "#EA4335", // Primary theme color
        },
        modal: {
          ondismiss: function () {
            setIsUpgrading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(response.error.description || "Payment failed");
        setIsUpgrading(false);
      });
      rzp.open();
    } catch (error) {
      console.error(error);
      toast.error("An error occurred starting checkout.");
      setIsUpgrading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div className="flex flex-col items-center justify-center space-y-8 py-12">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Upgrade your Job Hunt</h1>
          <p className="text-muted-foreground text-lg">Choose the plan that fits your career goals.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full px-4">
          {/* Free Plan */}
          <Card className={`relative ${currentTier === "free" ? "border-primary" : ""}`}>
            {currentTier === "free" && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
                Current Plan
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">Basic</CardTitle>
              <CardDescription>Everything you need to get started.</CardDescription>
              <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                ₹0
                <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> 3 AI Auto-Applies per day</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> 10 Outreach Emails per day</li>
                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> Basic Job Scraping</li>
                <li className="flex items-center text-muted-foreground"><Check className="mr-2 h-4 w-4 opacity-50" /> Standard AI Model</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                {currentTier === "free" ? "Active" : "Downgrade"}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className={`relative border-2 ${currentTier === "pro" ? "border-primary" : "border-zinc-200"}`}>
            {currentTier === "pro" && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
                Current Plan
              </div>
            )}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center shadow-md">
              <Zap className="h-3 w-3 mr-1" /> Recommended
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">JobCrab Pro</CardTitle>
              <CardDescription>Supercharge your job applications.</CardDescription>
              <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                ₹999
                <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center font-medium"><Check className="mr-2 h-4 w-4 text-primary" /> Unlimited AI Auto-Applies</li>
                <li className="flex items-center font-medium"><Check className="mr-2 h-4 w-4 text-primary" /> Unlimited Outreach Emails</li>
                <li className="flex items-center font-medium"><Check className="mr-2 h-4 w-4 text-primary" /> Priority Job Scraping (2x Faster)</li>
                <li className="flex items-center font-medium"><Check className="mr-2 h-4 w-4 text-primary" /> Premium Resume Export (PDF)</li>
                <li className="flex items-center font-medium"><Check className="mr-2 h-4 w-4 text-primary" /> Advanced App Analytics</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" 
                onClick={handleUpgrade}
                disabled={currentTier === "pro" || isUpgrading}
              >
                {isUpgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentTier === "pro" ? "Active" : "Upgrade to Pro"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
