import type { FC, PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

export type PageBackgroundVariant = "hero" | "compact" | "plain" | "room";

type PageBackgroundProps = PropsWithChildren<{
  variant?: PageBackgroundVariant;
}>;

type PageSectionProps = PropsWithChildren<{
  align?: "center" | "start";
  maxWidth?: "sm" | "md" | "lg" | "xl";
  padded?: boolean;
  className?: string;
}>;

const maxWidthMap: Record<NonNullable<PageSectionProps["maxWidth"]>, string> = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
};

const gradientConfig: Record<
  Extract<PageBackgroundVariant, 'hero' | 'compact'>,
  {
    topWrapper: string;
    topInner: string;
    bottomWrapper: string | null;
    bottomInner: string | null;
  }
> = {
  hero: {
    topWrapper: 'absolute inset-x-0 top-[-160px] h-[210px] blur-[120px]',
    topInner:
      'mx-auto h-full max-w-3xl bg-gradient-to-r from-brand-400/40 via-brand-500/30 to-brand-300/30',
    bottomWrapper: 'absolute inset-x-0 bottom-[-160px] h-[160px] blur-[110px]',
    bottomInner:
      'mx-auto h-full max-w-4xl bg-gradient-to-r from-indigo-500/20 via-brand-500/10 to-blue-300/20',
  },
  compact: {
    topWrapper: 'absolute inset-x-0 top-[-80px] h-[130px] blur-[90px]',
    topInner:
      'mx-auto h-full max-w-2xl bg-gradient-to-r from-brand-400/30 via-brand-500/20 to-brand-300/20',
    bottomWrapper: null,
    bottomInner: null,
  },
};

const gradientWrapperBase =
  "absolute inset-x-0 transition-all duration-700 ease-[cubic-bezier(0.33,1,0.68,1)]";

const gradientInnerBase =
  "mx-auto h-full transition-all duration-700 ease-[cubic-bezier(0.33,1,0.68,1)]";

export const PageBackground: FC<PageBackgroundProps> = ({
  variant = "hero",
  children,
}) => {
  const gradients =
    variant === "hero" || variant === "compact"
      ? gradientConfig[variant]
      : null;

  const showGradients = Boolean(gradients);
  const showGrid = variant === "hero" || variant === "compact";

  return (
    <div
      className={cn(
        'relative min-h-screen',
        variant !== 'room' && 'overflow-hidden',
        'bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white',
      )}
    >
      {showGradients && gradients && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-35"
        >
          <div className={cn(gradientWrapperBase, gradients.topWrapper)}>
            <div className={cn(gradientInnerBase, gradients.topInner)} />
          </div>
          {gradients.bottomWrapper && gradients.bottomInner && (
            <div className={cn(gradientWrapperBase, gradients.bottomWrapper)}>
              <div className={cn(gradientInnerBase, gradients.bottomInner)} />
            </div>
          )}
          {showGrid && (
            <div className="absolute inset-0 bg-brand-grid [background-size:32px_32px] opacity-15 dark:opacity-10" />
          )}
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
};

export const PageSection: FC<PageSectionProps> = ({
  align = "center",
  maxWidth = "lg",
  padded = true,
  className,
  children,
}) => {
  const alignment = align === "center" ? "text-center" : "text-left";

  return (
    <div
      className={cn(
        "relative mx-auto w-full",
        maxWidthMap[maxWidth],
        alignment,
        padded && "px-4 py-12 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
};
