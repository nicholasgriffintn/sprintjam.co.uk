import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "unstyled";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
  expandOnHover?: boolean;
  cursor?: "pointer" | "default" | "not-allowed";
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-brand-500 to-indigo-500 text-white shadow-floating hover:from-brand-600 hover:to-indigo-600 focus-visible:ring-brand-300",
  secondary:
    "bg-white/90 dark:bg-slate-900/60 text-brand-700 dark:text-white border border-slate-200/60 dark:border-white/10 hover:bg-white dark:hover:bg-slate-900 focus-visible:ring-slate-200",
  danger:
    "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-floating hover:from-red-600 hover:to-rose-600 focus-visible:ring-red-300",
  ghost:
    "bg-transparent text-white/80 border border-white/30 hover:border-white hover:text-white focus-visible:ring-white/50",
  unstyled: "",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-sm px-4 py-2 rounded-xl",
  md: "text-sm sm:text-base px-5 py-3 rounded-2xl",
  lg: "text-base px-6 py-4 rounded-2xl",
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: "p-1.5 rounded-xl",
  md: "p-2 rounded-2xl",
  lg: "p-2.5 rounded-2xl",
};

const iconOnlyExpandableSizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-2 rounded-xl",
  md: "px-3 py-2.5 rounded-2xl",
  lg: "px-3.5 py-3 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "left",
      isLoading = false,
      className,
      fullWidth,
      iconOnly = false,
      expandOnHover = false,
      children,
      disabled,
      cursor = "pointer",
      ...props
    },
    ref,
  ) => {
    const hasIcon = Boolean(icon) || isLoading;
    const showLeftIcon = Boolean(icon) && iconPosition === "left";
    const showRightIcon =
      (Boolean(icon) && iconPosition === "right") || isLoading;
    const rightIcon = isLoading ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      icon
    );

    const content =
      iconOnly && expandOnHover ? (
        <span className="inline-flex items-center">
          <span className="flex shrink-0 items-center justify-center leading-none">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
          </span>
          <span className="inline-grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-out group-hover:grid-cols-[1fr]">
            <span className="overflow-hidden whitespace-nowrap text-sm leading-none">
              <span className="px-2">{children}</span>
            </span>
          </span>
        </span>
      ) : iconOnly ? (
        <span className="flex items-center justify-center leading-none">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </span>
      ) : hasIcon ? (
        <>
          {showLeftIcon && (
            <span className="flex items-center justify-center text-current leading-none shrink-0">
              {icon}
            </span>
          )}
          <span className="leading-none">{children}</span>
          {showRightIcon ? (
            <span className="flex items-center justify-center leading-none shrink-0">
              {rightIcon}
            </span>
          ) : null}
        </>
      ) : (
        children
      );

    const sizeClass =
      variant === "unstyled"
        ? null
        : iconOnly
          ? expandOnHover
            ? iconOnlyExpandableSizeStyles[size]
            : iconOnlySizeStyles[size]
          : sizeStyles[size];

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-60",
          variantStyles[variant],
          sizeClass,
          fullWidth && "w-full",
          expandOnHover && "group gap-0",
          `cursor-${cursor} disabled:cursor-not-allowed`,
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";
