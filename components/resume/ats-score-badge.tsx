"use client";

/**
 * ATS Score Badge — Circular progress badge showing resume-JD match score.
 * Color coding: red < 50, yellow 50–75, green > 75
 */

interface AtsScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AtsScoreBadge({
  score,
  size = "md",
  className = "",
}: AtsScoreBadgeProps) {
  const roundedScore = Math.round(score);

  // Color based on score
  const getColor = () => {
    if (roundedScore >= 75) return { stroke: "#22c55e", text: "text-emerald-400", label: "Excellent" };
    if (roundedScore >= 50) return { stroke: "#eab308", text: "text-yellow-400", label: "Moderate" };
    return { stroke: "#ef4444", text: "text-red-400", label: "Needs Work" };
  };

  const color = getColor();

  // SVG circle dimensions
  const dimensions = {
    sm: { size: 60, strokeWidth: 4, fontSize: "text-sm", labelSize: "text-[8px]" },
    md: { size: 90, strokeWidth: 5, fontSize: "text-xl", labelSize: "text-[10px]" },
    lg: { size: 120, strokeWidth: 6, fontSize: "text-3xl", labelSize: "text-xs" },
  };

  const d = dimensions[size];
  const radius = (d.size - d.strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (roundedScore / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: d.size, height: d.size }}>
        <svg
          width={d.size}
          height={d.size}
          className="-rotate-90"
          viewBox={`0 0 ${d.size} ${d.size}`}
        >
          {/* Background circle */}
          <circle
            cx={d.size / 2}
            cy={d.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={d.strokeWidth}
            className="text-muted/40"
          />
          {/* Progress circle */}
          <circle
            cx={d.size / 2}
            cy={d.size / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={d.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${d.fontSize} ${color.text}`}>
            {roundedScore}
          </span>
          {size !== "sm" && (
            <span className={`${d.labelSize} text-muted-foreground`}>ATS</span>
          )}
        </div>
      </div>
      {size !== "sm" && (
        <span className={`text-xs font-medium ${color.text}`}>
          {color.label}
        </span>
      )}
    </div>
  );
}
