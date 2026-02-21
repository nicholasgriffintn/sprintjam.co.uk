import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";
import {
  jsonError,
  getRoomStub,
  escapeHtml,
  signState,
  verifyState,
  generateID,
  getRoomSessionToken,
  checkBotProtection,
} from "@sprintjam/utils";
import { getLinearOrganization, getLinearViewer } from "@sprintjam/services";

import { checkOAuthRateLimit } from "../../lib/rate-limit";
import { validateSession } from "./shared";

function jsonResponse(payload: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export async function initiateLinearOAuthController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const botCheck = checkBotProtection(
    request,
    env.ENABLE_JOIN_RATE_LIMIT === "true",
  );
  if (botCheck) {
    return botCheck;
  }

  const rateLimitCheck = await checkOAuthRateLimit(request, env);
  if (rateLimitCheck) {
    return rateLimitCheck;
  }

  const body = await request.json<{
    roomKey?: string;
    userName?: string;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const redirectUri =
      env.LINEAR_OAUTH_REDIRECT_URI ||
      "https://sprintjam.co.uk/api/linear/oauth/callback";

    if (!clientId || !env.LINEAR_OAUTH_CLIENT_SECRET) {
      return jsonError(
        "OAuth not configured. Please contact administrator.",
        500,
      );
    }

    const state = await signState(
      { roomKey, userName, nonce: generateID() },
      env.LINEAR_OAUTH_CLIENT_SECRET,
    );

    const authUrl = new URL("https://linear.app/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "read,write");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "consent");

    return jsonResponse({ authorizationUrl: authUrl.toString(), state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initiate OAuth";
    return jsonError(message, 500);
  }
}

export async function handleLinearOAuthCallbackController(
  url: URL,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>${escapeHtml(
        error,
      )}</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } },
    ) as unknown as CfResponse;
  }

  if (!code || !state) {
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>Missing code or state</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } },
    ) as unknown as CfResponse;
  }

  try {
    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;
    const redirectUri =
      env.LINEAR_OAUTH_REDIRECT_URI ||
      "https://sprintjam.co.uk/api/linear/oauth/callback";

    if (!clientId || !clientSecret) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>OAuth not configured</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } },
      ) as unknown as CfResponse;
    }

    const stateData = (await verifyState(state, clientSecret)) as {
      roomKey: string;
      userName: string;
      nonce: string;
    };
    const { roomKey, userName } = stateData;

    const tokenResponse = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to exchange code for token</p</body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } },
      ) as unknown as CfResponse;
    }

    const tokenData = await tokenResponse.json<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope?: string;
    }>();

    let linearOrganizationId: string | null = null;
    try {
      const organization = await getLinearOrganization(tokenData.access_token);
      linearOrganizationId = organization.id;
    } catch (orgError) {
      console.error("Failed to fetch Linear organization:", orgError);
    }

    let linearUserId: string | null = null;
    let linearUserEmail: string | null = null;
    try {
      const viewer = await getLinearViewer(tokenData.access_token);
      linearUserId = viewer.id;
      linearUserEmail = viewer.email;
    } catch (userError) {
      console.error("Failed to fetch Linear user:", userError);
    }

    const roomObject = getRoomStub(env, roomKey);
    const saveResponse = await roomObject.fetch(
      new Request("https://internal/linear/oauth/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenType: tokenData.token_type,
          expiresAt: Date.now() + tokenData.expires_in * 1000,
          scope: tokenData.scope || null,
          linearOrganizationId,
          linearUserId,
          linearUserEmail,
          authorizedBy: userName,
          estimateField: "estimate",
        }),
      }) as unknown as CfRequest,
    );

    if (!saveResponse.ok) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to save credentials</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } },
      ) as unknown as CfResponse;
    }

    return new Response(
      `<html><body><h1>Success!</h1><p>Linear connected successfully. You can close this window.</p></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } },
    ) as unknown as CfResponse;
  } catch (error) {
    console.error("OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>${escapeHtml(
        message,
      )}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } },
    ) as unknown as CfResponse;
  }
}

export async function getLinearOAuthStatusController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const roomObject = getRoomStub(env, roomKey);
    const response = await roomObject.fetch(
      new Request("https://internal/linear/oauth/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Cookie: `room_session=${sessionToken}` } : {}),
        },
        body: JSON.stringify({ roomKey, userName, sessionToken }),
      }) as unknown as CfRequest,
    );

    if (!response.ok) {
      return jsonError("Failed to get OAuth status", 500);
    }

    const data = await response.json<{
      connected: boolean;
      linearOrganizationId?: string;
      linearUserEmail?: string;
      expiresAt?: number;
      estimateField?: string | null;
    }>();

    return jsonResponse(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get OAuth status";
    return jsonError(message, 500);
  }
}

export async function revokeLinearOAuthController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;

  const sessionToken = getRoomSessionToken(request);

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.LINEAR_OAUTH_CLIENT_ID;
    const clientSecret = env.LINEAR_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return jsonError("Linear OAuth not configured", 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request("https://internal/linear/oauth/credentials", {
        method: "GET",
      }) as unknown as CfRequest,
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        "Linear not connected. Please connect your account.",
        404,
      );
    }

    const { credentials } = await credentialsResponse.json<{
      credentials: {
        accessToken: string;
        refreshToken: string | null;
      };
    }>();

    const tokenToRevoke = credentials.refreshToken || credentials.accessToken;
    if (tokenToRevoke) {
      const revokeResponse = await fetch(
        "https://api.linear.app/oauth/revoke",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            token: tokenToRevoke,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        },
      );

      if (!revokeResponse.ok) {
        const errorBody = await revokeResponse.text().catch(() => "");
        console.error("Failed to revoke Linear token:", errorBody);
        return jsonError("Failed to revoke Linear token with provider.", 502);
      }
    }

    const response = await roomObject.fetch(
      new Request("https://internal/linear/oauth/revoke", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Cookie: `room_session=${sessionToken}` } : {}),
        },
        body: JSON.stringify({ roomKey, userName, sessionToken }),
      }) as unknown as CfRequest,
    );

    if (!response.ok) {
      return jsonError("Failed to revoke OAuth credentials", 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to revoke OAuth credentials";
    return jsonError(message, 500);
  }
}
