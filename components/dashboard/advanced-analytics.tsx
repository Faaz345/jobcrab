"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, TrendingUp, Award, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { LiquidButton as Button } from "@/components/ui/liquid-glass-button";

interface Props {
  stats: any;
  isPro: boolean;
}

export function AdvancedAnalytics({ stats, isPro }: Props) {
  const overTimeData = stats?.applications_over_time || [];
  const avgAts = stats?.average_ats_score || 0;

  // We add a blur to the content if not pro, and render an absolute overlay
  const blurClass = !isPro ? "blur-[6px] select-none pointer-events-none" : "";

  return (
    <div className="relative mt-6 space-y-4">
      {/* If not Pro, show the lock overlay centered over everything in this section */}
      {!isPro && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/40 backdrop-blur-[2px]">
          <div className="flex max-w-sm flex-col items-center p-8 text-center bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">Advanced Analytics</h3>
            <p className="mb-6 text-sm text-zinc-300">
              Unlock deep insights into your application pipeline, response velocity, and average ATS scores with JobCrab Pro.
            </p>
            <Button asChild>
              <Link href="/dashboard/pricing">
                Upgrade to Pro
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className={`grid gap-4 lg:grid-cols-3 ${blurClass}`}>
        {/* Applications Over Time Area Chart */}
        <Card className="border-border/50 lg:col-span-2 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Application Velocity
            </CardTitle>
            <CardDescription>Applications sent over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {overTimeData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={overTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12, color: "#fff" }} itemStyle={{ color: "#a78bfa" }} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ATS Score Insight */}
        <Card className="border-border/50 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              Resume Strength
            </CardTitle>
            <CardDescription>Average ATS match score</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-8 border-muted">
              {/* Fake circular progress stroke */}
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="46"
                  fill="none" stroke="currentColor" strokeWidth="8"
                  strokeDasharray={`${avgAts * 2.89} 289`}
                  className="text-primary"
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold">{avgAts}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            
            <div className="mt-8 w-full space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Interview Probability</span>
                <span className="font-medium text-emerald-400 flex items-center">
                  {avgAts > 80 ? "High" : avgAts > 60 ? "Medium" : "Low"} 
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full rounded-full ${avgAts > 80 ? 'bg-emerald-500' : avgAts > 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                  style={{ width: `${Math.max(avgAts, 5)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
