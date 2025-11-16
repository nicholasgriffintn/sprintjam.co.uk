import type { InputHTMLAttributes, ReactNode } from 'react';
import { CheckCircle } from 'lucide-react';

import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  showValidation?: boolean;
  isValid?: boolean;
}

export const Input = ({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  fullWidth,
  showValidation = false,
  isValid = false,
  className,
  id,
  disabled,
  ...props
}: InputProps) => {
  const inputId =
    id ||
    (typeof label === 'string'
      ? label.toLowerCase().replace(/\s+/g, '-')
      : undefined);
  const hasRightContent =
    (icon && iconPosition === 'right') || (showValidation && isValid);

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          className={cn(
            'rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-sm transition',
            'placeholder:text-slate-400',
            'focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200',
            'dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500',
            'dark:focus:border-brand-400 dark:focus:ring-brand-900',
            'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
            'dark:disabled:bg-slate-800 dark:disabled:text-slate-400',
            icon && iconPosition === 'left' ? 'pl-12' : '',
            hasRightContent ? 'pr-12' : '',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
              : '',
            fullWidth ? 'w-full' : '',
            className
          )}
          {...props}
        />
        {showValidation && isValid && (
          <CheckCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
        )}
        {icon && iconPosition === 'right' && !showValidation && (
          <div className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {icon}
          </div>
        )}
      </div>
      {(helperText || error) && (
        <p
          className={cn(
            'text-xs',
            error
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};
