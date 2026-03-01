import type { ReactNode } from "react";
import { Toast as BaseToast } from "@base-ui/react/toast";
import type {
  ToastManagerAddOptions,
  ToastManagerPromiseOptions,
  ToastManagerUpdateOptions,
  ToastObject,
} from "@base-ui/react/toast";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/cn";

type AppToastAction = {
  label: string;
  onClick: () => void;
  variant?: "solid" | "outline";
};

type AppToastData = {
  actions?: AppToastAction[];
  hideClose?: boolean;
};
type AppToastOptions = ToastManagerAddOptions<AppToastData>;
type AppToastUpdateOptions = ToastManagerUpdateOptions<AppToastData>;
type AppToastPromiseOptions<Value> = ToastManagerPromiseOptions<
  Value,
  AppToastData
>;
type AppToastVariant = "success" | "error" | "warning" | "info" | "loading";

const DEFAULT_TIMEOUT = 5000;

const toastManager = BaseToast.createToastManager<AppToastData>();

const getPriority = (type: string | undefined) =>
  type === "error" || type === "warning" ? "high" : "low";

const withVariant = (
  type: AppToastVariant,
  options: string | AppToastOptions,
): AppToastOptions => {
  if (typeof options === "string") {
    return {
      description: options,
      priority: getPriority(type),
      type,
    };
  }

  const resolvedType = options.type ?? type;
  return {
    ...options,
    priority: options.priority ?? getPriority(resolvedType),
    type: resolvedType,
  };
};

const withPromiseVariant = <Value,>(
  type: AppToastVariant,
  options:
    | string
    | AppToastUpdateOptions
    | ((value: Value) => string | AppToastUpdateOptions),
) => {
  if (typeof options === "function") {
    return (value: Value) => {
      const resolved = options(value);
      return withVariant(type, resolved);
    };
  }

  return withVariant(type, options);
};

const typeStyles: Record<AppToastVariant, string> = {
  error:
    "border-rose-200/80 bg-rose-50/95 text-rose-950 dark:border-rose-500/30 dark:bg-rose-950/80 dark:text-rose-50",
  info: "border-sky-200/80 bg-sky-50/95 text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/80 dark:text-sky-50",
  loading:
    "border-brand-200/80 bg-brand-50/95 text-brand-950 dark:border-brand-500/30 dark:bg-brand-950/80 dark:text-brand-50",
  success:
    "border-emerald-200/80 bg-emerald-50/95 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-50",
  warning:
    "border-amber-200/80 bg-amber-50/95 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/80 dark:text-amber-50",
};

const iconStyles: Record<AppToastVariant, string> = {
  error: "text-rose-600 dark:text-rose-300",
  info: "text-sky-600 dark:text-sky-300",
  loading: "text-brand-600 dark:text-brand-300",
  success: "text-emerald-600 dark:text-emerald-300",
  warning: "text-amber-600 dark:text-amber-300",
};

const actionStyles: Record<AppToastVariant, string> = {
  error:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300 dark:bg-rose-500 dark:hover:bg-rose-400",
  info: "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-300 dark:bg-sky-500 dark:hover:bg-sky-400",
  loading:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-300 dark:bg-brand-500 dark:hover:bg-brand-400",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-300 dark:bg-emerald-500 dark:hover:bg-emerald-400",
  warning:
    "bg-amber-500 text-amber-950 hover:bg-amber-400 focus-visible:ring-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300",
};

const secondaryActionStyles: Record<AppToastVariant | "default", string> = {
  default:
    "border-slate-300/80 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10",
  error:
    "border-rose-300/80 text-rose-800 hover:bg-rose-100 dark:border-rose-400/30 dark:text-rose-100 dark:hover:bg-rose-400/10",
  info: "border-sky-300/80 text-sky-800 hover:bg-sky-100 dark:border-sky-400/30 dark:text-sky-100 dark:hover:bg-sky-400/10",
  loading:
    "border-brand-300/80 text-brand-800 hover:bg-brand-100 dark:border-brand-400/30 dark:text-brand-100 dark:hover:bg-brand-400/10",
  success:
    "border-emerald-300/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/30 dark:text-emerald-100 dark:hover:bg-emerald-400/10",
  warning:
    "border-amber-300/80 text-amber-900 hover:bg-amber-100 dark:border-amber-400/30 dark:text-amber-100 dark:hover:bg-amber-400/10",
};

const getToastType = (
  type: string | undefined,
): AppToastVariant | "default" => {
  if (
    type === "success" ||
    type === "error" ||
    type === "warning" ||
    type === "info" ||
    type === "loading"
  ) {
    return type;
  }

  return "default";
};

const getToastIcon = (type: string | undefined) => {
  switch (type) {
    case "success":
      return CheckCircle2;
    case "error":
      return XCircle;
    case "warning":
      return AlertTriangle;
    case "loading":
      return Loader2;
    default:
      return Info;
  }
};

const ToastViewport = () => {
  const { toasts } = BaseToast.useToastManager<AppToastData>();

  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className="fixed top-auto right-4 bottom-4 left-auto z-[120] flex w-[calc(100vw-2rem)] max-w-sm outline-none sm:right-6 sm:bottom-6">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
};

function ToastItem({ toast }: { toast: ToastObject<AppToastData> }) {
  const toastType = getToastType(toast.type);
  const Icon = getToastIcon(toast.type);
  const isLoading = toast.type === "loading";
  const hasCustomActions = Boolean(toast.data?.actions?.length);
  const isCompactToast =
    !toast.title && !toast.actionProps && !hasCustomActions;

  return (
    <BaseToast.Root
      toast={toast}
      className={cn(
        "[--gap:0.75rem] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.08)))] [--shrink:calc(1-var(--scale))] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] absolute right-0 bottom-0 left-auto z-[calc(1000-var(--toast-index))] mr-0 w-full origin-bottom [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] rounded-[1.25rem] border bg-clip-padding p-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl select-none after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-[ending-style]:opacity-0 data-[expanded]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))] data-[limited]:opacity-0 data-[starting-style]:[transform:translateY(150%)] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)] data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-[expanded]:data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-[expanded]:data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-[expanded]:data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] data-[expanded]:data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] h-[var(--height)] data-[expanded]:h-[var(--toast-height)] [transition:transform_0.45s_cubic-bezier(0.22,1,0.36,1),opacity_0.35s,height_0.15s]",
        toastType === "default"
          ? "border-slate-200/80 bg-white/95 text-slate-950 dark:border-white/10 dark:bg-slate-900/95 dark:text-white"
          : typeStyles[toastType],
      )}
    >
      <BaseToast.Content className="overflow-hidden transition-opacity duration-200 data-[behind]:pointer-events-none data-[behind]:opacity-0 data-[expanded]:pointer-events-auto data-[expanded]:opacity-100">
        <div
          className={cn(
            "flex gap-3 pr-8",
            isCompactToast ? "items-center" : "items-start",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-inner dark:bg-white/10",
              !isCompactToast && "mt-0.5",
              toastType === "default"
                ? "text-slate-600 dark:text-slate-300"
                : iconStyles[toastType],
            )}
          >
            <Icon className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </div>

          <div
            className={cn(
              "min-w-0 flex-1",
              isCompactToast ? "flex min-h-9 items-center" : "space-y-1",
            )}
          >
            {toast.title ? (
              <BaseToast.Title className="m-0 text-sm font-semibold tracking-tight" />
            ) : null}
            {toast.description ? (
              <BaseToast.Description className="m-0 text-sm leading-5 opacity-90" />
            ) : null}
            {toast.actionProps ? (
              <BaseToast.Action
                className={cn(
                  "mt-3 inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  toastType === "default"
                    ? "bg-slate-900 text-white hover:bg-slate-700 focus-visible:ring-slate-300 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    : actionStyles[toastType],
                )}
              />
            ) : null}
            {toast.data?.actions?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {toast.data.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={cn(
                      "inline-flex h-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                      action.variant === "outline"
                        ? secondaryActionStyles[toastType]
                        : toastType === "default"
                          ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700 focus-visible:ring-slate-300 dark:border-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                          : actionStyles[toastType],
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {toast.data?.hideClose ? null : (
          <BaseToast.Close
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl border border-transparent bg-transparent text-current/60 transition-colors hover:bg-black/5 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:hover:bg-white/10"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </BaseToast.Close>
        )}
      </BaseToast.Content>
    </BaseToast.Root>
  );
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  return (
    <BaseToast.Provider
      toastManager={toastManager}
      limit={4}
      timeout={DEFAULT_TIMEOUT}
    >
      {children}
      <ToastViewport />
    </BaseToast.Provider>
  );
}

export const useToast = () => BaseToast.useToastManager<AppToastData>();

export const toast = {
  add: (options: AppToastOptions) => toastManager.add(options),
  close: (id: string) => toastManager.close(id),
  update: (id: string, options: AppToastUpdateOptions) =>
    toastManager.update(id, options),
  success: (options: string | AppToastOptions) =>
    toastManager.add(withVariant("success", options)),
  error: (options: string | AppToastOptions) =>
    toastManager.add(withVariant("error", options)),
  warning: (options: string | AppToastOptions) =>
    toastManager.add(withVariant("warning", options)),
  info: (options: string | AppToastOptions) =>
    toastManager.add(withVariant("info", options)),
  loading: (options: string | AppToastOptions) =>
    toastManager.add({
      ...withVariant("loading", options),
      timeout: 0,
    }),
  promise: <Value,>(
    promise: Promise<Value>,
    options: AppToastPromiseOptions<Value>,
  ) =>
    toastManager.promise(promise, {
      loading: withVariant("loading", options.loading),
      success: withPromiseVariant("success", options.success),
      error: withPromiseVariant("error", options.error),
    }),
};
