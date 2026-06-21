"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import { motion } from "framer-motion";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const FREE_FEATURES = [
  { label: "3 AI Auto-Applies per day", muted: false },
  { label: "10 Outreach Emails per day", muted: false },
  { label: "Basic Job Search", muted: false },
  { label: "Standard AI Model", muted: true },
];

const PRO_FEATURES = [
  "Unlimited AI Auto-Applies",
  "Unlimited Outreach Emails",
  "Priority Job Search (2x Faster)",
  "Premium Resume Export (PDF)",
  "Advanced App Analytics",
];

export default function DashboardPricingPage() {
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentTier, setCurrentTier] = useState<"free" | "pro">("free");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        // /api/auth/me may return either the profile directly or { user }
        const profile = data?.user ?? data;
        if (profile && !profile.error) {
          if (profile.tier) setCurrentTier(profile.tier);
          setUserName(profile.name || "User");
          setUserEmail(profile.email || "");
        }
      })
      .catch(() => {
        /* non-blocking */
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
      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      const options = {
        key: rzpKey || "rzp_test_dummy",
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

          toast.success("Successfully upgraded to JobCrab Pro!");
          setCurrentTier("pro");
          router.refresh();
          setIsUpgrading(false);
        },
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: "#FD101A", // Primary theme color
        },
        modal: {
          ondismiss: function () {
            setIsUpgrading(false);
          },
        },
      };

      if (!rzpKey) {
        // Dummy flow when keys aren't set (local/dev)
        toast.info("Test Mode: Simulating successful Razorpay payment...");
        setTimeout(() => {
          options.handler({
            razorpay_payment_id: "pay_dummy_" + Date.now(),
            razorpay_order_id: order.id,
            razorpay_signature: "dummy_signature_bypass",
          });
        }, 1500);
        return;
      }

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="flex flex-col items-center justify-center space-y-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 sm:space-y-4 px-4"
        >
          <div className="flex justify-center mb-2">
            <Image
              src="/images/logo.png"
              alt="JobCrab Logo"
              width={1414}
              height={526}
              className="h-12 sm:h-16 w-auto object-contain dark:hidden"
            />
            <Image
              src="/images/logo-dark.png"
              alt="JobCrab Logo"
              width={1414}
              height={526}
              className="hidden h-12 sm:h-16 w-auto object-contain dark:block"
            />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Upgrade your Job Hunt
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Choose the plan that fits your career goals.
          </p>
        </motion.div>

        {/* Plans */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid w-full max-w-4xl grid-cols-1 gap-6 px-4 md:grid-cols-2 md:gap-8"
        >
          {/* Free Plan */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card
              className={`relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg ${
                currentTier === "free" ? "border-primary" : "border-border/60"
              }`}
            >
              {currentTier === "free" && (
                <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                  Current Plan
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">Basic</CardTitle>
                <CardDescription>
                  Everything you need to get started.
                </CardDescription>
                <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                  ₹0
                  <span className="ml-1 text-xl font-medium text-muted-foreground">
                    /mo
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <ul className="space-y-3 text-sm">
                  {FREE_FEATURES.map((f) => (
                    <li
                      key={f.label}
                      className={`flex items-center ${
                        f.muted ? "text-muted-foreground" : ""
                      }`}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 shrink-0 ${
                          f.muted ? "opacity-50" : "text-primary"
                        }`}
                      />
                      {f.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled>
                  {currentTier === "free" ? "Active" : "Downgrade"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card
              className={`relative flex h-full flex-col overflow-hidden border-2 transition-shadow hover:shadow-xl ${
                currentTier === "pro"
                  ? "border-primary shadow-primary/20"
                  : "border-primary/40"
              }`}
            >
              {currentTier === "pro" ? (
                <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                  Current Plan
                </div>
              ) : (
                <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                  Recommended
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  JobCrab Pro
                </CardTitle>
                <CardDescription>
                  Supercharge your job applications.
                </CardDescription>
                <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                  ₹999
                  <span className="ml-1 text-xl font-medium text-muted-foreground">
                    /mo
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <ul className="space-y-3 text-sm">
                  {PRO_FEATURES.map((label) => (
                    <li key={label} className="flex items-center font-medium">
                      <Check className="mr-2 h-4 w-4 shrink-0 text-primary" />
                      {label}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleUpgrade}
                  disabled={currentTier === "pro" || isUpgrading}
                >
                  {isUpgrading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {currentTier === "pro" ? "Active" : "Upgrade to Pro"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>

        <p className="px-4 text-center text-xs text-muted-foreground">
          Secure payments via Razorpay. Cancel anytime. Prices include applicable taxes.
        </p>
      </div>
    </>
  );
}
