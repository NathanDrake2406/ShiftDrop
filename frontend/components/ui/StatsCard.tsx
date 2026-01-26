import { type ReactNode } from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  subtext?: string;
}

function getTrendColor(trend: StatsCardProps["trend"]): string {
  switch (trend) {
    case "up":
      return "text-green-500";
    case "down":
      return "text-red-500";
    default:
      return "text-slate-400";
  }
}

export function StatsCard({ label, value, icon, trend, subtext }: StatsCardProps): ReactNode {
  const trendColor = getTrendColor(trend);

  return (
    <div className="ui-surface p-4 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
        {subtext && <span className={`text-sm ${trendColor}`}>{subtext}</span>}
      </div>
    </div>
  );
}
