import { CheckCircle2, HelpCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import type { InsightPrompt } from "@/utils/workspace-insight-prompts";

interface SuggestedFocusCardsProps {
  prompts: InsightPrompt[];
}

export function SuggestedFocusCards({ prompts }: SuggestedFocusCardsProps) {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
      {prompts.map((prompt) => {
        const Icon = prompt.tone === "warning" ? HelpCircle : CheckCircle2;

        return (
          <div
            key={prompt.title}
            className={cn(
              "rounded-lg border bg-white p-4 dark:bg-slate-950/40",
              prompt.tone === "warning"
                ? "border-amber-200/70 dark:border-amber-400/20"
                : "border-emerald-200/70 dark:border-emerald-400/20",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                  prompt.tone === "warning"
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {prompt.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {prompt.detail}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
