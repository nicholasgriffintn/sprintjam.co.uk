import type {
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';

import type { Env } from '../../types';
import { createJsonResponse, jsonError } from '../../utils/http';
import {
  FixitRunsRepository,
  type FixitRunRecord,
  type UpsertFixitRunInput,
} from '../../repositories/fixit-runs';

function ensureDb(env: Env) {
  if (!env.FIXITS_DB) {
    throw new Error('Fixits database binding is not configured');
  }
  return env.FIXITS_DB;
}

function requireAdmin(request: CfRequest, env: Env): CfResponse | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError('Missing Authorization header', 401);
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (env.FIXITS_ADMIN_TOKEN) {
    if (token !== env.FIXITS_ADMIN_TOKEN) {
      return jsonError('Invalid admin token', 403);
    }
    return null;
  }

  return jsonError(
    'Fixit admin token is not configured. Set FIXITS_ADMIN_TOKEN via wrangler secret',
    500
  );
}

function sanitizeInput(body: Record<string, any>): UpsertFixitRunInput {
  if (!body.fixitId || typeof body.fixitId !== 'string') {
    throw new Error('fixitId is required');
  }
  if (!body.name || typeof body.name !== 'string') {
    throw new Error('name is required');
  }

  return {
    fixitId: body.fixitId,
    name: body.name,
    description: typeof body.description === 'string' ? body.description : null,
    startDate: typeof body.startDate === 'number' ? body.startDate : null,
    endDate: typeof body.endDate === 'number' ? body.endDate : null,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    config: typeof body.config === 'object' && body.config ? body.config : null,
    roomId: typeof body.roomId === 'string' && body.roomId ? body.roomId : null,
    moderator:
      typeof body.moderator === 'string' && body.moderator
        ? body.moderator
        : null,
  };
}

export async function listFixitRunsController(
  url: URL,
  env: Env
): Promise<CfResponse> {
  const db = ensureDb(env);
  const repo = new FixitRunsRepository(db);
  const includeInactive = url.searchParams.get('all') === 'true';
  const runs = await repo.listRuns({ includeInactive });
  return createJsonResponse({ runs });
}

export async function getFixitRunController(
  fixitId: string,
  env: Env
): Promise<CfResponse> {
  const db = ensureDb(env);
  const repo = new FixitRunsRepository(db);
  const run = await repo.getRun(fixitId);
  if (!run) {
    return jsonError('Fixit run not found', 404);
  }
  return createJsonResponse({ run });
}

export async function createFixitRunController(
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const body = (await request.json()) as Record<string, any>;
  let input: UpsertFixitRunInput;
  try {
    input = sanitizeInput(body);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Invalid payload',
      400
    );
  }

  const db = ensureDb(env);
  const repo = new FixitRunsRepository(db);
  const run = await repo.createRun(input);
  return createJsonResponse({ run }, 201);
}

export async function updateFixitRunController(
  fixitId: string,
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const body = (await request.json()) as Record<string, any>;
  const updates: Partial<UpsertFixitRunInput> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.endDate !== undefined) updates.endDate = body.endDate;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.config !== undefined) updates.config = body.config;
  if (body.roomId !== undefined) updates.roomId = body.roomId;
  if (body.moderator !== undefined) updates.moderator = body.moderator;

  const db = ensureDb(env);
  const repo = new FixitRunsRepository(db);
  const run = await repo.updateRun(fixitId, updates);
  if (!run) {
    return jsonError('Fixit run not found', 404);
  }
  return createJsonResponse({ run });
}

export async function deleteFixitRunController(
  fixitId: string,
  request: CfRequest,
  env: Env
): Promise<CfResponse> {
  const authError = requireAdmin(request, env);
  if (authError) {
    return authError;
  }

  const db = ensureDb(env);
  const repo = new FixitRunsRepository(db);
  const existing = await repo.getRun(fixitId);
  if (!existing) {
    return jsonError('Fixit run not found', 404);
  }

  await repo.deleteRun(fixitId);
  return createJsonResponse({ ok: true });
}
