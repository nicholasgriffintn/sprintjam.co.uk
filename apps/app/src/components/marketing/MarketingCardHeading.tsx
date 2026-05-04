import type { PropsWithChildren, ReactNode } from "react";

import { cn } from "@/lib/cn";

type MarketingCardHeadingSize = "base" | "lg" | "xl";
type MarketingCardIconTone =
  | "brand"
  | "orange"
  | "violet"
  | "emerald"
  | "slate";
type MarketingCardHeadingTag = "h2" | "h3";

type MarketingCardHeadingProps = PropsWithChildren<{
  as?: MarketingCardHeadingTag;
  icon: ReactNode;
  size?: MarketingCardHeadingSize;
  tone?: MarketingCardIconTone;
  className?: string;
  titleClassName?: string;
}>;

const iconToneClasses: Record<MarketingCardIconTone, string> = {
  brand: "from-brand-500/15 to-indigo-500/20 text-brand-600",
  orange: "from-orange-400/20 to-pink-500/20 text-orange-500",
  violet: "from-violet-400/20 to-purple-500/20 text-violet-600",
  emerald: "from-emerald-400/20 to-teal-500/20 text-emerald-600",
  slate: "from-slate-500/10 to-slate-500/15 text-slate-400 dark:text-slate-500",
};

const iconSizeClasses: Record<MarketingCardHeadingSize, string> = {
  base: "h-12 w-12 rounded-2xl [&_svg]:h-4 [&_svg]:w-4",
  lg: "h-12 w-12 rounded-2xl [&_svg]:h-5 [&_svg]:w-5",
  xl: "h-12 w-12 rounded-2xl [&_svg]:h-5 [&_svg]:w-5",
};

const titleSizeClasses: Record<MarketingCardHeadingSize, string> = {
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export const MarketingCardHeading = ({
  as: Heading = "h3",
  icon,
  size = "lg",
  tone = "brand",
  className,
  titleClassName,
  children,
}: MarketingCardHeadingProps) => {
  return (
    <div className={cn("flex items-center gap-3 sm:block", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-gradient-to-br sm:mb-4",
          iconToneClasses[tone],
          iconSizeClasses[size],
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <Heading
        className={cn(
          "font-semibold leading-snug",
          !titleClassName && "text-slate-900 dark:text-white",
          titleSizeClasses[size],
          titleClassName,
        )}
      >
        {children}
      </Heading>
    </div>
  );
};
