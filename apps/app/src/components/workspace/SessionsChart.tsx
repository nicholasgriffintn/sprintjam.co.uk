import { useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/Button";

interface SessionTimelineData {
  period: string;
  count: number;
}

interface SessionsChartProps {
  data: SessionTimelineData[];
}

type TimeRange = "month" | "quarter" | "all";

export function SessionsChart({ data }: SessionsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("quarter");

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const timeRangeOptions = [
    { id: "month" as const, label: "This month" },
    { id: "quarter" as const, label: "Last 3 months" },
    { id: "all" as const, label: "All time" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">
          Sessions over time
        </h3>
        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800"
          role="group"
          aria-label="Time range selector"
        >
          {timeRangeOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="unstyled"
              onClick={() => setTimeRange(option.id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                timeRange === option.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = (item.count / maxCount) * 100;

          return (
            <div key={item.period} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {item.period}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {item.count} sessions
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 * index,
                    ease: "easeOut",
                  }}
                  className="h-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
