import type { ReactNode } from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

interface AccordionItem {
  question: string;
  answer: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  return (
    <BaseAccordion.Root multiple className={cn("grid gap-4", className)}>
      {items.map(({ question, answer }) => (
        <BaseAccordion.Item
          key={question}
          className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md data-[open]:border-brand-200 data-[open]:bg-white dark:border-white/10 dark:bg-white/5 dark:data-[open]:border-brand-300/40"
        >
          <BaseAccordion.Header>
            <BaseAccordion.Trigger className="group flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left text-base font-semibold text-slate-900 transition data-[panel-open]:text-brand-700 dark:text-white dark:data-[panel-open]:text-brand-200">
              <span>{question}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-brand-600 transition group-data-[panel-open]:rotate-180" />
            </BaseAccordion.Trigger>
          </BaseAccordion.Header>
          <BaseAccordion.Panel className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
            <div className="space-y-2 px-5 pb-5 text-left text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {answer}
            </div>
          </BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  );
}
