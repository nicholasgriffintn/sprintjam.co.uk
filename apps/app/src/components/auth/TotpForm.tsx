import type { FormEvent } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type TotpFormProps = {
  title: string;
  description: string;
  code: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  isBusy: boolean;
  error: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
};

export function TotpForm({
  title,
  description,
  code,
  onChange,
  onSubmit,
  submitLabel,
  isBusy,
  error,
  secondaryAction,
}: TotpFormProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{description}</p>
      </div>

      <motion.form
        onSubmit={onSubmit}
        className="space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          label="Authenticator code"
          placeholder="000000"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "").slice(0, 6);
            onChange(value);
          }}
          error={error}
          fullWidth
          required
          autoFocus
          disabled={isBusy}
          autoComplete="one-time-code"
          className="text-center text-2xl tracking-widest"
        />

        <div className="flex flex-col gap-4">
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isBusy}
            disabled={code.length !== 6}
          >
            {submitLabel}
          </Button>
          {secondaryAction ? (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      </motion.form>
    </div>
  );
}
