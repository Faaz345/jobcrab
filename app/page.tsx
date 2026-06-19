"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CrowdCanvas } from "@/components/ui/skiper-ui/job-seekers-canvas";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="landing-page min-h-screen bg-[#FBE6D6] text-[#2C2417]">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-[#E8E0D4] bg-[#FBE6D6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image src="/images/logo.png" alt="JobCrab Logo" width={400} height={100} className="h-12 w-auto object-contain scale-[1.75] origin-left" priority />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-1.5 text-[14px] font-medium text-[#6B5D4D] transition-colors hover:text-[#2C2417]"
            >
              Sign in
            </Link>
            <Button
              variant="primary"
              onClick={() => router.push('/register')}
              className="px-5"
            >
              Get started
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section 
        className="relative overflow-hidden flex flex-col justify-center pb-[15vh]"
        style={{ minHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Crowd canvas behind everything */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[75vh] w-full opacity-[0.55]">
          <CrowdCanvas
            src="/images/peeps/all-peeps.png"
            rows={15}
            cols={7}
            className="absolute bottom-0 h-full w-full"
          />
        </div>

        {/* Bottom fade so peeps blend into the background */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#FBE6D6] to-transparent" />

        {/* Content */}
        <div className="relative mx-auto max-w-2xl px-6 text-center z-10 -translate-y-2">
          {/* Tagline pill */}
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E8E0D4] bg-[#F3EDE4] px-3 py-1 text-[12px] text-[#8A7A67]">
            <Image src="/images/logo.png" alt="JobCrab Icon" width={16} height={16} className="object-contain" />
            <span>Survive the job market</span>
          </div>

          {/* Heading */}
          <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-semibold leading-[1.15] tracking-tight text-[#2C2417]">
            Crabs forage for food.
            <br />
            <span className="text-[#FD101A]">You hunt for jobs.</span>
            <br />
            We make it smarter.
          </h1>

          {/* Subheading */}
          <p className="mx-auto mt-4 max-w-lg text-[15px] sm:text-[17px] leading-relaxed text-[#6B5D4D]">
            Discover roles across multiple boards, tailor your resume with AI, 
            and send personalized cold emails — one unified platform.
          </p>

          {/* CTAs */}
          <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              variant="primary"
              onClick={() => router.push('/register')}
              className="w-full sm:w-auto"
            >
              Start your hunt
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/login')}
              className="rounded-full"
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-[#E8E0D4]" />
      </div>

      {/* ── Metaphor strip ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-12 text-center text-[13px] uppercase tracking-[0.15em] text-[#B0A290]">
            Same instinct — smarter tools
          </p>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                crab: "🦀 Forage",
                crabLine: "Crabs probe every crevice for sustenance.",
                human: "Discover",
                humanLine:
                  "Search LinkedIn, Naukri, RemoteOK, and Wellfound — AI probes every board for the right fit.",
              },
              {
                step: "02",
                crab: "🐚 Adapt",
                crabLine: "They find a shell that fits — protection in one.",
                human: "Tailor",
                humanLine:
                  "AI rewrites your resume to match every JD — your perfect shell for each role.",
              },
              {
                step: "03",
                crab: "🌊 Reach",
                crabLine: "They seize what they find before the tide takes it.",
                human: "Outreach",
                humanLine:
                  "Generate cold emails and reach out before the window closes — with safety at every step.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group rounded-2xl border border-[#E8E0D4] bg-white/60 p-6 transition-all hover:border-[#F30111]/25 hover:shadow-sm"
              >
                <span className="text-[12px] font-semibold text-[#F30111]">
                  {item.step}
                </span>

                {/* Crab analogy */}
                <div className="mt-4 rounded-lg bg-[#FDF5EE] p-3">
                  <div className="text-[13px] font-medium text-[#F30111]/90">
                    {item.crab}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#B0A290]">
                    {item.crabLine}
                  </p>
                </div>

                {/* Human action */}
                <h3 className="mt-4 text-[16px] font-semibold text-[#2C2417]">
                  {item.human}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#8A7A67]">
                  {item.humanLine}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-[#E8E0D4]" />
      </div>

      {/* ── Why JobCrab ── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-10 text-center text-[13px] uppercase tracking-[0.15em] text-[#B0A290]">
            Why JobCrab
          </p>

          <div className="space-y-6">
            {[
              {
                title: "AI-Powered",
                desc: "Groq & DeepSeek LLMs tailor every resume and email to perfection.",
              },
              {
                title: "Safety First",
                desc: "Dry-run mode, volume caps, and human review before every email send.",
              },
              {
                title: "Track Everything",
                desc: "Kanban pipeline from discovery to offer. Never lose track of an application.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-xl border border-[#E8E0D4] bg-white/60 p-5"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F30111]/10 text-[12px] text-[#F30111]">
                  ✦
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#2C2417]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#8A7A67]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-5xl px-6">
        <div className="h-px bg-[#E8E0D4]" />
      </div>

      {/* ── Final CTA ── */}
      <section className="py-20">
        <div className="mx-auto max-w-lg px-6 text-center">
          <div className="mb-8 flex justify-center">
            <Image src="/images/logo.png" alt="JobCrab Logo" width={600} height={150} className="h-32 w-auto object-contain scale-[1.5]" />
          </div>
          <h2 className="text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight text-[#2C2417]">
            Crabs don&apos;t wait for the tide.
          </h2>
          <p className="mt-3 mb-8 text-[15px] text-[#8A7A67]">
            They go get it. So should you.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push('/register')}
          >
            Get started — it&apos;s free
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E8E0D4] py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-[12px] text-[#B0A290]">
            <Image src="/images/logo.png" alt="JobCrab Logo" width={100} height={24} className="opacity-60 grayscale object-contain" />
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-5 text-[12px] text-[#B0A290]">
            <Link href="/login" className="transition-colors hover:text-[#6B5D4D]">
              Sign in
            </Link>
            <Link href="/register" className="transition-colors hover:text-[#6B5D4D]">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
