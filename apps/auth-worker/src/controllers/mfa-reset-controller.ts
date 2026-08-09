import { AuthError } from "@ngriffin_uk/auth-core";
import type { AuthWorkerEnv } from "@sprintjam/types";

import {
  createAuthChallengeErrorResponse,
  readChallengeUserId,
  requireChallengeMode,
} from "../lib/auth-challenge";
import { getRequestMeta } from "../lib/auth-helpers";
import { resolveSprintJamAppOrigin } from "../lib/app-origin";
import {
  sendMfaResetRequestNotifications,
  sendMfaResetResolutionNotification,
} from "../lib/mfa-reset-notifications";
import {
  forbiddenResponse,
  jsonError,
  jsonResponse,
  notFoundResponse,
} from "../lib/response";
import { createSprintJamAuth } from "../lib/shared-auth";
import { WorkspaceAuthRepository } from "../repositories/workspace-auth";
import { getAuthOrError, getWorkspaceViewer } from "./workspace-viewer";

const MFA_RESET_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function requestMfaResetController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const body = await request.json<{ challengeToken?: string }>();
  const challengeToken = body?.challengeToken?.trim();
  if (!challengeToken) {
    return jsonError(
      "Challenge token is required",
      400,
      "challenge_token_required",
    );
  }

  try {
    const selection = await createSprintJamAuth(env).consumeChallenge(
      challengeToken,
      "sprintjam",
      ["mfa_selection"],
    );
    requireChallengeMode(selection.payload, "verify");

    const userId = Number(readChallengeUserId(selection.payload));
    if (!Number.isSafeInteger(userId) || userId < 1) {
      throw new AuthError("challenge_mismatch");
    }

    const repo = new WorkspaceAuthRepository(env.DB);
    const user = await repo.getUserById(userId);
    if (!user) {
      return notFoundResponse("User not found");
    }

    const membership = await repo.getOrganisationMembership(
      userId,
      user.organisationId,
    );
    if (!membership || membership.status !== "active") {
      return forbiddenResponse("Workspace access is not active");
    }

    const now = Date.now();
    await repo.expireMfaResetRequests(userId, now);
    const existing = await repo.getPendingMfaResetRequestForUser(userId, now);
    const resetRequest =
      existing ??
      (await repo.createMfaResetRequest({
        organisationId: user.organisationId,
        userId,
        requestedAt: now,
        expiresAt: now + MFA_RESET_REQUEST_TTL_MS,
      }));

    if (!existing) {
      const organisation = await repo.getOrganisationById(user.organisationId);
      const members = await repo.getOrganisationMembers(
        user.organisationId,
        "active",
      );
      await sendMfaResetRequestNotifications({
        sendEmail: env.SEND_EMAIL,
        requester: user,
        admins: members.filter(
          (member) => member.role === "admin" && member.id !== userId,
        ),
        workspaceName: organisation?.name ?? "your workspace",
        requestOrigin: resolveSprintJamAppOrigin(request, env.ENVIRONMENT),
        expiresAt: resetRequest.expiresAt,
      });
    }

    const { ip, userAgent } = getRequestMeta(request);
    try {
      await repo.logAuditEvent({
        userId,
        email: user.email,
        event: "mfa_reset_request",
        status: "success",
        reason: existing ? "already_pending" : "workspace_admin_required",
        ip,
        userAgent,
      });
    } catch (error) {
      console.error("Failed to record MFA reset request audit event.", error);
    }

    return jsonResponse(
      {
        request: resetRequest,
        message: "Your workspace admins have been asked to review the reset.",
      },
      existing ? 200 : 201,
    );
  } catch (error) {
    return createAuthChallengeErrorResponse(error);
  }
}

export async function approveMfaResetRequestController(
  request: Request,
  env: AuthWorkerEnv,
  requestId: number,
): Promise<Response> {
  return resolveMfaResetRequest(request, env, requestId, "approved");
}

export async function rejectMfaResetRequestController(
  request: Request,
  env: AuthWorkerEnv,
  requestId: number,
): Promise<Response> {
  return resolveMfaResetRequest(request, env, requestId, "rejected");
}

async function resolveMfaResetRequest(
  request: Request,
  env: AuthWorkerEnv,
  requestId: number,
  resolution: "approved" | "rejected",
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) return workspace.response;
  if (!workspace.viewer.isWorkspaceAdmin) {
    return forbiddenResponse(
      "Only workspace admins can review authentication reset requests",
    );
  }

  const resetRequest = await auth.result.repo.getMfaResetRequestById(requestId);
  if (
    !resetRequest ||
    resetRequest.organisationId !== workspace.viewer.user.organisationId
  ) {
    return notFoundResponse("Authentication reset request not found");
  }

  if (resetRequest.status !== "pending") {
    return jsonError(
      "Authentication reset request has already been resolved",
      409,
      "mfa_reset_request_resolved",
    );
  }

  const now = Date.now();
  if (resetRequest.expiresAt <= now) {
    await auth.result.repo.expireMfaResetRequests(resetRequest.userId, now);
    return jsonError(
      "Authentication reset request has expired",
      410,
      "mfa_reset_request_expired",
    );
  }

  if (
    resolution === "approved" &&
    resetRequest.userId === workspace.viewer.user.id
  ) {
    return forbiddenResponse(
      "Another workspace admin must approve your authentication reset",
      "mfa_reset_self_approval_forbidden",
    );
  }

  const resolved =
    resolution === "approved"
      ? await auth.result.repo.approveMfaResetRequest({
          requestId,
          organisationId: resetRequest.organisationId,
          userId: resetRequest.userId,
          resolvedById: workspace.viewer.user.id,
          resolvedAt: now,
        })
      : await auth.result.repo.rejectMfaResetRequest({
          requestId,
          organisationId: resetRequest.organisationId,
          resolvedById: workspace.viewer.user.id,
          resolvedAt: now,
        });

  if (!resolved) {
    return jsonError(
      "Authentication reset request was resolved by another admin",
      409,
      "mfa_reset_request_resolved",
    );
  }

  const targetUser = await auth.result.repo.getUserById(resetRequest.userId);
  if (resolution === "rejected") {
    try {
      await auth.result.repo.logAuditEvent({
        userId: resetRequest.userId,
        email: targetUser?.email,
        event: "mfa_reset_request",
        status: "failure",
        reason: `rejected_by:${workspace.viewer.user.id}`,
      });
    } catch (error) {
      console.error("Failed to record MFA reset rejection audit event.", error);
    }
  }

  const organisation = await auth.result.repo.getOrganisationById(
    resetRequest.organisationId,
  );
  if (targetUser) {
    await sendMfaResetResolutionNotification({
      sendEmail: env.SEND_EMAIL,
      requesterEmail: targetUser.email,
      workspaceName: organisation?.name ?? "your workspace",
      resolution,
      requestOrigin: resolveSprintJamAppOrigin(request, env.ENVIRONMENT),
    });
  }

  return jsonResponse({
    message:
      resolution === "approved"
        ? "Authentication reset approved. The member must sign in and set up two-factor authentication again."
        : "Authentication reset request rejected.",
  });
}
