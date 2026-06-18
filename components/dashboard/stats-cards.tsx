"use client";

import { Briefcase, CalendarClock, Mail, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  total: number;
  this_week: number;
  emails_sent: number;
  response_rate: number;
}

export function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Total Applications", value: stats.total, icon: Briefcase, color: "text-blue-400" },
    { label: "This Week", value: stats.this_week, icon: CalendarClock, color: "text-purple-400" },
    { label: "Emails Sent", value: stats.emails_sent, icon: Mail, color: "text-amber-400" },
    { label: "Response Rate", value: `${Math.round(stats.response_rate * 100)}%`, icon: TrendingUp, color: "text-emerald-400" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-muted ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
