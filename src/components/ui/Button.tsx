import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-500 to-indigo-500 text-white shadow-floating hover:from-brand-600 hover:to-indigo-600 focus-visible:ring-brand-300',
  secondary:
    'bg-white/90 dark:bg-slate-900/60 text-brand-700 dark:text-white border border-slate-200/60 dark:border-white/10 hover:bg-white dark:hover:bg-slate-900 focus-visible:ring-slate-200',
  ghost:
    'bg-transparent text-white/80 border border-white/30 hover:border-white hover:text-white focus-visible:ring-white/50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm px-4 py-2 rounded-xl',
  md: 'text-sm sm:text-base px-5 py-3 rounded-2xl',
  lg: 'text-base px-6 py-4 rounded-2xl',
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: 'p-1.5 rounded-xl',
  md: 'p-2 rounded-2xl',
  lg: 'p-2.5 rounded-2xl',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className,
  fullWidth,
  iconOnly = false,
  children,
  disabled,
  ...props
}: ButtonProps) => {
  const content = iconOnly ? (
    <span className="flex items-center justify-center">
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    </span>
  ) : (
    <>
      {icon && iconPosition === 'left' && (
        <span className="flex items-center justify-center text-current">
          {icon}
        </span>
      )}
      <span className="font-semibold">{children}</span>
      {(icon && iconPosition === 'right') || isLoading ? (
        <span className="flex items-center justify-center">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </span>
      ) : null}
    </>
  );

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
        variantStyles[variant],
        iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
};
