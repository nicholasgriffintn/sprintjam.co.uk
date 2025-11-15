import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Input = ({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  fullWidth,
  className,
  id,
  disabled,
  ...props
}: InputProps) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          className={cn(
            'rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-base text-slate-900 shadow-sm transition',
            'placeholder:text-slate-400',
            'focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200',
            'dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500',
            'dark:focus:border-brand-400 dark:focus:ring-brand-900',
            'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
            'dark:disabled:bg-slate-800 dark:disabled:text-slate-400',
            icon && iconPosition === 'left' && 'pl-10',
            icon && iconPosition === 'right' && 'pr-10',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-200',
            fullWidth && 'w-full',
            className
          )}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
      </div>
      {(helperText || error) && (
        <p
          className={cn(
            'text-xs',
            error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};
