import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { AuthWorkerEnv } from '@sprintjam/types';
import {
  jsonError,
  generateToken,
  hashToken,
  extractDomain,
} from '@sprintjam/utils';
import { sendMagicLinkEmail } from '@sprintjam/services';

import { WorkspaceAuthRepository } from '../repositories/workspace-auth';
import { MAGIC_LINK_EXPIRY_MS, SESSION_EXPIRY_MS } from '../constants';

/**
 * POST /api/auth/magic-link
 * Request a magic link to be sent to the user's email
 */
export async function requestMagicLinkController(
  request: CfRequest,
  env: AuthWorkerEnv
): Promise<CfResponse> {
  const body = await request.json<{ email?: string }>();
  const email = body?.email?.toLowerCase().trim();

  if (!email) {
    return jsonError('Email is required', 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonError('Invalid email format', 400);
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

  const token = await generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = Date.now() + MAGIC_LINK_EXPIRY_MS;

  try {
    await repo.createMagicLink(email, tokenHash, expiresAt);
  } catch (error) {
    console.error('Failed to persist magic link request:', error);
    return jsonError(
      'Unable to create a magic link right now. Please try again shortly.',
      500
    );
  }

  const origin = new URL(request.url).origin;
  const magicLink = `${origin}/auth/verify?token=${token}`;

  try {
    await sendMagicLinkEmail({
      email,
      magicLink,
      resendApiKey: env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error('Failed to send magic link email:', error);
    return jsonError('Failed to send magic link email', 500);
  }

  return new Response(
    JSON.stringify({
      message: 'Magic link sent to your email',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  ) as unknown as CfResponse;
}

/**
 * POST /api/auth/verify
 * Verify magic link token and create session
 */
export async function verifyMagicLinkController(
  request: CfRequest,
  env: AuthWorkerEnv
): Promise<CfResponse> {
  const body = await request.json<{ token?: string }>();
  const token = body?.token;

  if (!token) {
    return jsonError('Token is required', 400);
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  const email = await repo.validateMagicLink(tokenHash);
  if (!email) {
    return jsonError('Invalid or expired magic link', 401);
  }

  const domain = extractDomain(email);

  const organisationId = await repo.getOrCreateOrganisation(domain);

  const userId = await repo.getOrCreateUser(email, organisationId);

  const sessionToken = await generateToken();
  const sessionTokenHash = await hashToken(sessionToken);
  const sessionExpiresAt = Date.now() + SESSION_EXPIRY_MS;

  await repo.createSession(userId, sessionTokenHash, sessionExpiresAt);

  const user = await repo.getUserByEmail(email);

  return new Response(
    JSON.stringify({
      sessionToken,
      expiresAt: sessionExpiresAt,
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        organisationId: user?.organisationId,
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  ) as unknown as CfResponse;
}

/**
 * GET /api/auth/me
 * Get current user info from session token
 */
export async function getCurrentUserController(
  request: CfRequest,
  env: AuthWorkerEnv
): Promise<CfResponse> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError('Unauthorized', 401);
  }

  const token = authHeader.substring(7);
  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  const session = await repo.validateSession(tokenHash);
  if (!session) {
    return jsonError('Invalid or expired session', 401);
  }

  const user = await repo.getUserByEmail(session.email);
  if (!user) {
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

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
export async function logoutController(
  request: CfRequest,
  env: AuthWorkerEnv
): Promise<CfResponse> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError('Unauthorized', 401);
  }

  const token = authHeader.substring(7);
  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  await repo.invalidateSession(tokenHash);

  return new Response(
    JSON.stringify({
      message: 'Logged out successfully',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  ) as unknown as CfResponse;
}
