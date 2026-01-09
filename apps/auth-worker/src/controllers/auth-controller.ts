import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { AuthWorkerEnv } from "@sprintjam/types";
import {
  jsonError,
  generateToken,
  generateVerificationCode,
  hashToken,
  extractDomain,
  createSessionCookie,
  clearSessionCookie,
  getSessionTokenFromRequest,
} from "@sprintjam/utils";
import { sendVerificationCodeEmail } from "@sprintjam/services";

import { WorkspaceAuthRepository } from "../repositories/workspace-auth";
import { MAGIC_LINK_EXPIRY_MS, SESSION_EXPIRY_MS } from "../constants";

export async function requestMagicLinkController(
  request: CfRequest,
  env: AuthWorkerEnv
): Promise<CfResponse> {
  const body = await request.json<{ email?: string }>();
  const email = body?.email?.toLowerCase().trim();

  if (!email) {
    return jsonError('Email is required', 400);
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return jsonError('Invalid email format', 400);
  }

  if (env.ENABLE_MAGIC_LINK_RATE_LIMIT === 'true') {
    const key = `${email}-${request.headers.get('cf-connecting-ip') ?? 'unknown'}`;
    const { success: rateLimitSuccess } =
      await env.MAGIC_LINK_RATE_LIMITER.limit({
        key,
      });

    if (!rateLimitSuccess) {
      return jsonError(
        'Rate limit exceeded. Please wait before requesting another magic link.',
        429
      );
    }
  }

  const domain = extractDomain(email);
  const repo = new WorkspaceAuthRepository(env.DB);

  let isDomainAllowed = false;
  try {
    isDomainAllowed = await repo.isDomainAllowed(domain);
  } catch (error) {
    console.error('Failed to check domain allowlist:', error);
    return jsonError(
      'Workspace allowlist is unavailable. Please try again in a moment.',
      503
    );
  }

  if (!isDomainAllowed) {
    return jsonError(
      'Your email domain is not authorized for workspace access. Please contact your administrator.',
      403
    );
  }

  const code = generateVerificationCode();
  const codeHash = await hashToken(code);
  const expiresAt = Date.now() + MAGIC_LINK_EXPIRY_MS;

  try {
    await repo.createMagicLink(email, codeHash, expiresAt);
  } catch (error) {
    console.error('Failed to persist verification code:', error);
    return jsonError(
      'Unable to create a verification code right now. Please try again shortly.',
      500
    );
  }

  try {
    await sendVerificationCodeEmail({
      email,
      code,
      resendApiKey: env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error('Failed to send verification code email:', error);
    return jsonError('Failed to send verification code email', 500);
  }

  return new Response(
    JSON.stringify({
      message: 'Verification code sent to your email',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  ) as unknown as CfResponse;
}

export async function verifyCodeController(
  request: CfRequest,
  env: AuthWorkerEnv
): Promise<CfResponse> {
  const body = await request.json<{ email?: string; code?: string }>();
  const email = body?.email?.toLowerCase().trim();
  const code = body?.code?.trim();

  if (!email || !code) {
    return jsonError('Email and code are required', 400);
  }

  const codeHash = await hashToken(code);
  const repo = new WorkspaceAuthRepository(env.DB);

  const result = await repo.validateVerificationCode(email, codeHash);
  if (!result.success) {
    const errorMessages = {
      invalid: 'Invalid verification code',
      expired: 'Verification code has expired',
      used: 'Verification code has already been used',
      locked: 'Too many failed attempts. Please request a new code.',
    };
    return jsonError(errorMessages[result.error], 401);
  }

  const domain = extractDomain(result.email);

  const organisationId = await repo.getOrCreateOrganisation(domain);

  const userId = await repo.getOrCreateUser(email, organisationId);

  const sessionToken = await generateToken();
  const sessionTokenHash = await hashToken(sessionToken);
  const sessionExpiresAt = Date.now() + SESSION_EXPIRY_MS;

  await repo.createSession(userId, sessionTokenHash, sessionExpiresAt);

  const user = await repo.getUserByEmail(email);

  const maxAge = Math.floor(SESSION_EXPIRY_MS / 1000);
  const cookieValue = createSessionCookie(sessionToken, maxAge);

  return new Response(
    JSON.stringify({
      expiresAt: sessionExpiresAt,
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        organisationId: user?.organisationId,
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieValue,
      },
    }
  ) as unknown as CfResponse;
}

export async function getCurrentUserController(
  request: CfRequest,
  env: AuthWorkerEnv
): Promise<CfResponse> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return jsonError('Unauthorized', 401);
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  const session = await repo.validateSession(tokenHash);
  if (!session) {
    return jsonError('Invalid or expired session', 401);
  }

  const user = await repo.getUserByEmail(session.email);
  if (!user?.id) {
    return jsonError('User not found', 404);
  }

  const teams = await repo.getUserTeams(user.id);

  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organisationId: user.organisationId,
      },
      teams,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  ) as unknown as CfResponse;
}

export async function logoutController(
  request: CfRequest,
  env: AuthWorkerEnv,
): Promise<CfResponse> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return jsonError('Unauthorized', 401);
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  await repo.invalidateSession(tokenHash);

  return new Response(
    JSON.stringify({
      message: "Logged out successfully",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie(),
      },
    },
  ) as unknown as CfResponse;
}
