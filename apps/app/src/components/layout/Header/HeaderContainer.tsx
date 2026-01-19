import type { FC } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { type HeaderContainerProps } from '@/components/layout/Header/types';
import { Z_INDEX, HEADER_TRANSITION } from "@/constants";

const GLASSMORPHISM_STYLES =
  "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-white/50 dark:border-white/10";

export const HeaderContainer: FC<HeaderContainerProps> = ({
  variant,
  children,
  className,
}) => {
  const isMarketing = variant === "marketing";
  const zIndex = Z_INDEX.header[variant];

  if (isMarketing) {
    return (
      <motion.div
        className={cn(
          "flex w-full justify-center px-4 py-6 sm:py-8",
          className,
        )}
        layout
        transition={HEADER_TRANSITION}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.header
      className={cn(
        "sticky top-0",
        GLASSMORPHISM_STYLES,
        variant === "room" || variant === "workspace"
          ? "px-4 py-3 shadow-sm"
          : "",
        className,
      )}
      style={{ zIndex }}
      layout
      transition={HEADER_TRANSITION}
    >
      {variant === "workspace" ? (
        <div className="flex items-center justify-between gap-2">
          {children}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          {children}
        </div>
      )}
    </motion.header>
  );
};
