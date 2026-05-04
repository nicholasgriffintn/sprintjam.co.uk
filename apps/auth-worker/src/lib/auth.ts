import type { D1Database } from "@cloudflare/workers-types";

import { hashToken } from "@sprintjam/utils";

import { WorkspaceAuthRepository } from "../repositories/workspace-auth";
import { getSessionTokenFromRequest } from "./session";

export interface AuthResult {
  userId: number;
  email: string;
  repo: WorkspaceAuthRepository;
}

export interface AuthError {
  status: "error";
  code: "unauthorized" | "expired";
}

export function isAuthError(
  result: AuthResult | AuthError,
): result is AuthError {
  return "status" in result && result.status === "error";
}

export async function authenticateRequest(
  request: Request,
  db: D1Database,
): Promise<AuthResult | AuthError> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return { status: "error", code: "unauthorized" };
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(db);

  const result = await repo.validateSession(tokenHash);

  if (!result) {
    return { status: "error", code: "expired" };
  }

  return {
    userId: result.userId,
    email: result.email,
    repo,
  };
}
