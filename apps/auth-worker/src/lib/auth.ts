import type { D1Database } from "@cloudflare/workers-types";

import { WorkspaceAuthRepository } from "../repositories/workspace-auth";
import { getSessionTokenFromRequest } from "./session";
import { createSprintJamAuth } from "./shared-auth";

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

  const repo = new WorkspaceAuthRepository(db);
  const result = await createSprintJamAuth({ DB: db }).touchSession(token);

  if (!result) {
    return { status: "error", code: "expired" };
  }

  return {
    userId: Number(result.user.id),
    email: result.user.email,
    repo,
  };
}
