import { CheckCircle2 } from "lucide-react";
import { RETRO_TEMPLATES } from "@sprintjam/utils";

import { cn } from "@/lib/cn";

interface RetroTemplateGridProps {
  selectedTemplateId?: string;
  onSelect?: (templateId: string) => void;
  limit?: number;
}

const toneClasses = {
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200",
  sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
  violet:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200",
  slate:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200",
} as const;

export function RetroTemplateGrid({
  selectedTemplateId,
  onSelect,
  limit,
}: RetroTemplateGridProps) {
  const templates = limit ? RETRO_TEMPLATES.slice(0, limit) : RETRO_TEMPLATES;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => {
        const selected = template.id === selectedTemplateId;
        const content = (
          <div
            className={cn(
              "flex h-full flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-left shadow-sm transition dark:border-white/10 dark:bg-slate-900/60",
              onSelect && "hover:-translate-y-0.5 hover:border-brand-300",
              selected && "border-brand-300 ring-2 ring-brand-200",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  {template.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {template.summary}
                </p>
              </div>
              {selected ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-brand-500" />
              ) : null}
            </div>
            <div className="grid gap-2">
              {template.columns.map((column) => (
                <div
                  key={column.id}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    toneClasses[column.tone],
                  )}
                >
                  <span className="font-semibold">{column.title}</span>
                  <span className="ml-2 opacity-80">{column.prompt}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        );

        return onSelect ? (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className="text-left"
          >
            {content}
          </button>
        ) : (
          <div key={template.id}>{content}</div>
        );
      })}
    </div>
  );
}
