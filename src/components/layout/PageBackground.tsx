import type { FC, PropsWithChildren } from "react";

import { cn } from "../../lib/cn";

type PageBackgroundProps = PropsWithChildren<{
  align?: "center" | "start";
  maxWidth?: "sm" | "md" | "lg" | "xl";
  padded?: boolean;
  variant?: "hero" | "compact";
}>;

const maxWidthMap: Record<
  NonNullable<PageBackgroundProps["maxWidth"]>,
  string
> = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
};

export const PageBackground: FC<PageBackgroundProps> = ({
  align = "center",
  maxWidth = "lg",
  padded = true,
  variant = "hero",
  children,
}) => {
  const alignment = align === "center" ? "text-center" : "text-left";
  const gradients =
    variant === "hero"
      ? {
          topWrapper: "absolute inset-x-0 top-[-160px] h-[420px] blur-[120px]",
          topInner:
            "mx-auto h-full max-w-3xl bg-gradient-to-r from-brand-400/40 via-brand-500/30 to-brand-300/30",
          bottomWrapper:
            "absolute inset-x-0 bottom-[-160px] h-[320px] blur-[110px]",
          bottomInner:
            "mx-auto h-full max-w-4xl bg-gradient-to-r from-indigo-500/20 via-brand-500/10 to-blue-300/20",
        }
      : {
          topWrapper: "absolute inset-x-0 top-[-80px] h-[260px] blur-[90px]",
          topInner:
            "mx-auto h-full max-w-2xl bg-gradient-to-r from-brand-400/30 via-brand-500/20 to-brand-300/20",
          bottomWrapper: null,
          bottomInner: null,
        };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-35"
      >
        <div className={gradients.topWrapper}>
          <div className={gradients.topInner} />
        </div>
        {gradients.bottomWrapper && gradients.bottomInner && (
          <div className={gradients.bottomWrapper}>
            <div className={gradients.bottomInner} />
          </div>
        )}
        <div className="absolute inset-0 bg-brand-grid [background-size:32px_32px] opacity-15 dark:opacity-10" />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto w-full",
          maxWidthMap[maxWidth],
          alignment,
          padded && "px-4 py-12 sm:px-6 lg:px-8",
        )}
      >
        {children}
      </div>
    </div>
  );
};
