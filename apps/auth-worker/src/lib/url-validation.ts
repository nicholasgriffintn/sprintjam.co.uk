interface OptionalHttpUrlOptions {
  label: string;
  maxLength: number;
}

export type OptionalHttpUrlResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string };

export function normalizeOptionalHttpUrl(
  value: string | null | undefined,
  { label, maxLength }: OptionalHttpUrlOptions,
): OptionalHttpUrlResult {
  if (value === null) {
    return { ok: true, value: null };
  }

  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (trimmed.length > maxLength) {
    return {
      ok: false,
      message: `${label} must be ${maxLength} characters or less`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, message: `${label} must be a valid URL` };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      ok: false,
      message: `${label} must start with http:// or https://`,
    };
  }

  return { ok: true, value: parsed.toString() };
}
