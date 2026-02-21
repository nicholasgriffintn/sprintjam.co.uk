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

import { checkOAuthRateLimit } from "../../lib/rate-limit";
import { validateSession } from "./shared";

function jsonResponse(payload: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export async function initiateGithubOAuthController(
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

    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
    const redirectUri =
      env.GITHUB_OAUTH_REDIRECT_URI ||
      "https://sprintjam.co.uk/api/github/oauth/callback";

    if (!clientId || !clientSecret) {
      return jsonError(
        "OAuth not configured. Please contact administrator.",
        500,
      );
    }

    const state = await signState(
      { roomKey, userName, nonce: generateID() },
      clientSecret,
    );

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "repo user:email");
    authUrl.searchParams.set("allow_signup", "false");

    return jsonResponse({ authorizationUrl: authUrl.toString(), state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initiate OAuth";
    return jsonError(message, 500);
  }
}

export async function handleGithubOAuthCallbackController(
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
    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
    const redirectUri =
      env.GITHUB_OAUTH_REDIRECT_URI ||
      "https://sprintjam.co.uk/api/github/oauth/callback";

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

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          state,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("GitHub token exchange failed:", errorData);
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to exchange code for token</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } },
      ) as unknown as CfResponse;
    }

    const tokenData = await tokenResponse.json<{
      access_token: string;
      scope?: string;
      token_type?: string;
    }>();

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "SprintJam",
      },
    });

    if (!userResponse.ok) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to fetch GitHub user</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } },
      ) as unknown as CfResponse;
    }

    const userData = await userResponse.json<{
      login?: string;
      name?: string;
      email?: string | null;
    }>();

    let primaryEmail = userData.email ?? null;
    if (!primaryEmail) {
      try {
        const emailResponse = await fetch(
          "https://api.github.com/user/emails",
          {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${tokenData.access_token}`,
              "User-Agent": "SprintJam",
            },
          },
        );
        if (emailResponse.ok) {
          const emails = (await emailResponse.json()) as Array<{
            email: string;
            primary?: boolean;
            verified?: boolean;
          }>;
          const primary = emails.find(
            (entry) => entry.primary && entry.verified,
          );
          primaryEmail = primary?.email ?? null;
        }
      } catch (emailError) {
        console.warn("Failed to fetch GitHub emails", emailError);
      }
    }

    const roomObject = getRoomStub(env, roomKey);
    await roomObject.fetch(
      new Request("https://internal/github/oauth/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: null,
          tokenType: tokenData.token_type ?? "bearer",
          expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
          scope: tokenData.scope ?? null,
          githubLogin: userData.login ?? null,
          githubUserEmail: primaryEmail,
          defaultOwner: userData.login ?? null,
          defaultRepo: null,
          authorizedBy: userName,
        }),
      }) as unknown as CfRequest,
    );

    return new Response(
      `<html><body><h1>Success!</h1><p>GitHub connected successfully. You can close this window.</p><script>window.close();</script></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } },
    ) as unknown as CfResponse;
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      `<html><body><h1>OAuth Error</h1><p>${escapeHtml(
        message,
      )}</p><script>window.close();</script></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } },
    ) as unknown as CfResponse;
  }
}

export async function getGithubOAuthStatusController(
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
      new Request("https://internal/github/oauth/status", {
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
      githubLogin?: string | null;
      githubUserEmail?: string | null;
      defaultOwner?: string | null;
      defaultRepo?: string | null;
      expiresAt?: number;
    }>();

    return jsonResponse(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get OAuth status";
    return jsonError(message, 500);
  }
}

export async function revokeGithubOAuthController(
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

    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return jsonError("GitHub OAuth not configured", 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request("https://internal/github/oauth/credentials", {
        method: "GET",
      }) as unknown as CfRequest,
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        "GitHub not connected. Please connect your account.",
        404,
      );
    }

    const { credentials } = await credentialsResponse.json<{
      credentials: {
        accessToken: string;
      };
    }>();

    const revokeResponse = await fetch(
      `https://api.github.com/applications/${clientId}/grant`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: credentials.accessToken }),
      },
    );

    if (!revokeResponse.ok) {
      const errorBody = await revokeResponse.text().catch(() => "");
      console.error("Failed to revoke GitHub token:", errorBody);
      return jsonError("Failed to revoke GitHub token with provider.", 502);
    }

    const response = await roomObject.fetch(
      new Request("https://internal/github/oauth/revoke", {
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
