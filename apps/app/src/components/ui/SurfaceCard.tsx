import type { ComponentPropsWithoutRef, FC, PropsWithChildren } from "react";

import { cn } from "../../lib/cn";

type SurfaceVariant = "default" | "subtle";
type SurfacePadding = "none" | "sm" | "md";

type SurfaceCardProps = PropsWithChildren<
  ComponentPropsWithoutRef<"div"> & {
    variant?: SurfaceVariant;
    padding?: SurfacePadding;
  }
>;

const baseVariants: Record<SurfaceVariant, string> = {
  default:
    "bg-white/85 dark:bg-slate-900/55 border border-white/50 dark:border-white/5 shadow-[0_12px_32px_rgba(15,23,42,0.12)]",
  subtle:
    "bg-white/65 dark:bg-slate-900/35 border border-white/40 dark:border-white/5 shadow-[0_6px_20px_rgba(15,23,42,0.08)]",
};

const paddingMap: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-4 sm:p-5",
  md: "p-5 sm:p-6",
};

export const SurfaceCard: FC<SurfaceCardProps> = ({
  className,
  variant = "default",
  padding = "md",
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-3xl backdrop-blur-xl transition-all duration-300",
        baseVariants[variant],
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
