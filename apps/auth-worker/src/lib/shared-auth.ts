import { createAuth, type AuthUserWithEmail } from "@ngriffin_uk/auth-core";
import {
  magicLinkAuth,
  type MagicLinkDelivery,
} from "@ngriffin_uk/auth-magic-link";
import { otpAuth } from "@ngriffin_uk/auth-otp";
import { webAuthn } from "@ngriffin_uk/auth-webauthn";
import type { AuthWorkerEnv } from "@sprintjam/types";

import {
  AUTH_CHALLENGE_EXPIRY_MS,
  MAGIC_LINK_EXPIRY_MS,
  SESSION_EXPIRY_MS,
} from "../constants";
import { getWebAuthnRequestContext } from "../controllers/auth/webauthn-context";
import { createSprintJamCoreAuthStores } from "../repositories/shared-auth-core";
import {
  createSprintJamOtpStore,
  createSprintJamWebAuthnStore,
} from "../repositories/shared-auth-mfa";

export interface SprintJamAuthUser extends AuthUserWithEmail {
  readonly organisationId: number;
  readonly name: string | null;
  readonly workspaceRole: "admin" | "member";
}

type AuthDatabaseEnv = Pick<AuthWorkerEnv, "DB"> &
  Partial<Pick<AuthWorkerEnv, "TOKEN_ENCRYPTION_SECRET">>;

export function createSprintJamAuth(env: AuthDatabaseEnv) {
  const stores = createSprintJamCoreAuthStores(
    env.DB,
    env.TOKEN_ENCRYPTION_SECRET,
  );
  return createAuth<SprintJamAuthUser>({
    ...stores,
    sessionTtlMs: SESSION_EXPIRY_MS,
    challengeTtlMs: AUTH_CHALLENGE_EXPIRY_MS,
  });
}

export function findSprintJamAuthUser(
  env: AuthDatabaseEnv,
  userId: number,
): Promise<SprintJamAuthUser | null> {
  return createSprintJamCoreAuthStores(env.DB).users.findById(String(userId));
}

export function createSprintJamMagicLinkAuth(
  env: AuthWorkerEnv,
  options: {
    readonly resolveUser: (email: string) => Promise<SprintJamAuthUser | null>;
    readonly send: (delivery: MagicLinkDelivery) => Promise<void>;
  },
) {
  const stores = createSprintJamCoreAuthStores(
    env.DB,
    env.TOKEN_ENCRYPTION_SECRET,
  );
  return createAuth<SprintJamAuthUser>({
    ...stores,
    sessionTtlMs: SESSION_EXPIRY_MS,
    challengeTtlMs: MAGIC_LINK_EXPIRY_MS,
  }).use(
    magicLinkAuth({
      mode: "code",
      codeLength: 6,
      resolveUser: options.resolveUser,
      send: options.send,
    }),
  );
}

export function createSprintJamOtpAuth(env: AuthWorkerEnv) {
  return createSprintJamAuth(env).use(
    otpAuth({
      issuer: "SprintJam",
      recoveryCodeCount: 8,
      store: createSprintJamOtpStore(env.DB, env.TOKEN_ENCRYPTION_SECRET),
    }),
  );
}

export function createSprintJamWebAuthnAuth(
  request: Request,
  env: AuthWorkerEnv,
) {
  const { origin, rpId } = getWebAuthnRequestContext(request);
  return createSprintJamAuth(env).use(
    webAuthn({
      rpId,
      rpName: "SprintJam",
      origins: [origin],
      store: createSprintJamWebAuthnStore(env.DB),
    }),
  );
}

export function toSprintJamAuthUser(input: {
  readonly id: number;
  readonly email: string;
  readonly name: string | null;
  readonly organisationId: number;
  readonly createdAt?: number;
  readonly workspaceRole: "admin" | "member";
}): SprintJamAuthUser {
  return {
    id: String(input.id),
    email: input.email,
    createdAt: new Date(input.createdAt ?? Date.now()),
    organisationId: input.organisationId,
    name: input.name,
    workspaceRole: input.workspaceRole,
  };
}
