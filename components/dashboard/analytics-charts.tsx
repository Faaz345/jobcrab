"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_ORDER = [
  "discovered", "resume_tailored", "email_drafted", "email_sent",
  "response_received", "interview", "offer", "rejected", "withdrawn",
];
const SOURCE_COLORS: Record<string, string> = {
  remoteok: "#34d399",
  naukri: "#60a5fa",
  wellfound: "#c084fc",
  unknown: "#94a3b8",
};

interface Props {
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

export function AnalyticsCharts({ byStatus, bySource }: Props) {
  const statusData = STATUS_ORDER
    .filter((s) => byStatus[s])
    .map((s) => ({ name: s.replace(/_/g, " "), count: byStatus[s] }));

  const sourceData = Object.entries(bySource).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Pipeline Funnel</CardTitle></CardHeader>
        <CardContent>
          {statusData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">By Source</CardTitle></CardHeader>
        <CardContent>
          {sourceData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {sourceData.map((entry) => (
                    <Cell key={entry.name} fill={SOURCE_COLORS[entry.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
