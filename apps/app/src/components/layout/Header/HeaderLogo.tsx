import type { FC } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router";

import { cn } from "@/lib/cn";
import { type HeaderLogoProps } from "@/components/layout/Header/types";
import { getPathFromScreen } from "@/config/routes";
import {
  LOGO_SIZES,
  LOGO_TEXT_SIZES,
  HEADER_TRANSITION,
  SITE_NAME,
} from "@/constants";

export const HeaderLogo: FC<HeaderLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
  onClick,
  layoutId = "header-logo",
}) => {
  const sizeConfig = LOGO_SIZES[size];
  const textSize = LOGO_TEXT_SIZES[size];

  const content = (
    <>
      <motion.img
        src="/logo-192.png"
        alt={SITE_NAME}
        className={cn(
          sizeConfig.container,
          sizeConfig.padding,
          "rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5",
        )}
        transition={HEADER_TRANSITION}
        layoutId={layoutId}
      />
      {showText && (
        <motion.span
          className={cn(
            textSize,
            "font-semibold tracking-tight text-slate-900 dark:text-white",
          )}
          transition={HEADER_TRANSITION}
        >
          {SITE_NAME}
        </motion.span>
      )}
    </>
  );

  const containerClass = cn("flex items-center gap-3", className);

  if (onClick) {
    return (
      <Link
        to={getPathFromScreen("welcome")}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={cn(containerClass, "cursor-pointer")}
      >
        {content}
      </Link>
    );
  }

  return (
    <motion.div
      className={containerClass}
      transition={HEADER_TRANSITION}
      layout
    >
      {content}
    </motion.div>
  );
};
