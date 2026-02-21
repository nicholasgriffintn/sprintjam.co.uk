import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import type { SessionTimelineData } from "@sprintjam/types";

import { Button } from "@/components/ui/Button";

interface SessionsChartProps {
  data: SessionTimelineData[];
}

type TimeRange = "month" | "quarter" | "all";

export function SessionsChart({ data }: SessionsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    switch (timeRange) {
      case "month":
        return data.slice(-1);
      case "quarter":
        return data.slice(-3);
      case "all":
      default:
        return data;
    }
  }, [data, timeRange]);

  const maxCount = Math.max(...filteredData.map((d) => d.count), 1);
  const totalSessions = filteredData.reduce((sum, d) => sum + d.count, 0);

  const timeRangeOptions = [
    { id: "month" as const, label: "This month" },
    { id: "quarter" as const, label: "Last 3 months" },
    { id: "all" as const, label: "All time" },
  ];

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">
          Sessions over time
        </h3>
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-8 dark:border-slate-700 dark:bg-slate-800/50">
          <CalendarDays className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            No session data yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sessions will appear here as they are created
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">
            Sessions over time
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {totalSessions} sessions in selected period
          </p>
        </div>
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
        {filteredData.map((item, index) => {
          const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

          return (
            <div key={item.yearMonth} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {item.period}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {item.count} {item.count === 1 ? "session" : "sessions"}
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(percentage, 2)}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 * index,
                    ease: "easeOut",
                  }}
                  className={`h-full rounded-lg ${
                    item.count > 0
                      ? "bg-gradient-to-r from-brand-500 to-brand-600"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
