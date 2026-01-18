import type {
  Request as CfRequest,
  D1Database,
} from "@cloudflare/workers-types";

import { getSessionTokenFromRequest, hashToken } from "@sprintjam/utils";
import { drizzle } from "drizzle-orm/d1";
import { eq, gt, and } from "drizzle-orm";
import { workspaceSessions, users } from "@sprintjam/db";
import * as schema from "@sprintjam/db/d1/schemas";

import { WorkspaceAuthRepository } from "../repositories/workspace-auth";

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
  request: CfRequest,
  db: D1Database,
): Promise<AuthResult | AuthError> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return { status: "error", code: "unauthorized" };
  }

  const tokenHash = await hashToken(token);
  const drizzleDb = drizzle(db, { schema });

  const result = await drizzleDb
    .select({
      userId: workspaceSessions.userId,
      email: users.email,
    })
    .from(workspaceSessions)
    .innerJoin(users, eq(workspaceSessions.userId, users.id))
    .where(
      and(
        eq(workspaceSessions.tokenHash, tokenHash),
        gt(workspaceSessions.expiresAt, Date.now()),
      ),
    )
    .get();

  if (!result) {
    return { status: "error", code: "expired" };
  }

  return {
    userId: result.userId,
    email: result.email,
    repo: new WorkspaceAuthRepository(db),
  };
}
