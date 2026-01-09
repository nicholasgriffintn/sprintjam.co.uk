import type { ErrorKind } from "@/types";

type NullableKind = ErrorKind | null | undefined;

const statusToKind = (status?: number): NullableKind => {
  if (!status) {
    return null;
  }
  if (status === 401) {
    return "auth";
  }
  if (status === 403) {
    return "permission";
  }
  if (status === 422 || status === 400) {
    return "validation";
  }
  if (status >= 500) {
    return "network";
  }
  return null;
};

interface BaseErrorOptions {
  kind?: NullableKind;
  cause?: unknown;
}

export class ApplicationError extends Error {
  kind: NullableKind;
  cause?: unknown;

  constructor(message: string, { kind, cause }: BaseErrorOptions = {}) {
    super(message);
    this.name = "ApplicationError";
    this.kind = kind ?? null;
    if (cause) {
      this.cause = cause;
    }
  }
}

interface HttpErrorInit extends BaseErrorOptions {
  status: number;
  code?: string;
  retryable?: boolean;
}

export class HttpError extends ApplicationError {
  status: number;
  code?: string;
  retryable: boolean;

  constructor({
    message,
    status,
    code,
    retryable,
    kind,
    cause,
  }: HttpErrorInit & { message: string }) {
    super(message, {
      kind: kind ?? statusToKind(status),
      cause,
    });
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.retryable = retryable ?? status >= 500;
  }
}

export class NetworkError extends ApplicationError {
  retryable: boolean;
  status?: number;

  constructor(
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, {
      kind: options.status ? statusToKind(options.status) : "network",
      cause: options.cause,
    });
    this.name = "NetworkError";
    this.status = options.status;
    this.retryable = options.retryable ?? true;
  }
}

export class ValidationError extends ApplicationError {
  field?: string;
  issues?: string[];

  constructor(
    message: string,
    options: {
      field?: string;
      issues?: string[];
      cause?: unknown;
    } = {},
  ) {
    super(message, {
      kind: "validation",
      cause: options.cause,
    });
    this.name = "ValidationError";
    this.field = options.field;
    this.issues = options.issues;
  }
}

export class AuthError extends ApplicationError {
  requiresReauth: boolean;

  constructor(
    message: string,
    options: { requiresReauth?: boolean; cause?: unknown } = {},
  ) {
    super(message, {
      kind: "auth",
      cause: options.cause,
    });
    this.name = "AuthError";
    this.requiresReauth = options.requiresReauth ?? true;
  }
}

export type KnownError =
  | ApplicationError
  | HttpError
  | NetworkError
  | ValidationError
  | AuthError;

export const isAbortError = (error: unknown): error is DOMException =>
  error instanceof DOMException && error.name === "AbortError";

export const ensureApplicationError = (
  error: unknown,
  fallbackMessage: string,
  kind?: NullableKind,
): ApplicationError => {
  if (error instanceof ApplicationError) {
    return error;
  }
  if (error instanceof Error) {
    return new ApplicationError(error.message || fallbackMessage, {
      cause: error,
      kind,
    });
  }
  return new ApplicationError(fallbackMessage, { kind });
};

export const getErrorDetails = (
  error: unknown,
  fallbackMessage: string,
  defaultKind: NullableKind = null,
): { message: string; kind: NullableKind } => {
  if (error instanceof ApplicationError) {
    return {
      message: error.message || fallbackMessage,
      kind: error.kind ?? defaultKind,
    };
  }
  if (error instanceof Error) {
    return { message: error.message || fallbackMessage, kind: defaultKind };
  }
  return { message: fallbackMessage, kind: defaultKind };
};
