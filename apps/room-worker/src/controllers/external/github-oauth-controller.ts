import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { GithubOAuthStatus, RoomWorkerEnv } from "@sprintjam/types";
import {
  jsonError,
  getRoomStub,
  signState,
  verifyState,
  generateID,
  getRoomSessionToken,
  checkBotProtection,
} from "@sprintjam/utils";

import { checkOAuthRateLimit } from "../../lib/rate-limit";
import { jsonResponse } from "../../lib/response";
import {
  fetchOAuthStatus,
  oauthHtmlErrorResponse,
  oauthHtmlSuccessResponse,
  revokeOAuthCredentials,
  validateSession,
} from "./shared";

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
    return oauthHtmlErrorResponse(error, 400);
  }

  if (!code || !state) {
    return oauthHtmlErrorResponse("Missing code or state", 400);
  }

  try {
    const clientId = env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;
    const redirectUri =
      env.GITHUB_OAUTH_REDIRECT_URI ||
      "https://sprintjam.co.uk/api/github/oauth/callback";

    if (!clientId || !clientSecret) {
      return oauthHtmlErrorResponse("OAuth not configured", 500);
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
      return oauthHtmlErrorResponse("Failed to exchange code for token", 500);
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
      return oauthHtmlErrorResponse("Failed to fetch GitHub user", 500);
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

    return oauthHtmlSuccessResponse(
      "GitHub connected successfully. You can close this window.",
      true,
    );
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return oauthHtmlErrorResponse(message, 500, true);
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
    const data = await fetchOAuthStatus<GithubOAuthStatus>(
      roomObject,
      "github",
      {
        roomKey,
        userName,
        sessionToken,
      },
    );

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

    await revokeOAuthCredentials(roomObject, "github", {
      roomKey,
      userName,
      sessionToken,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to revoke OAuth credentials";
    return jsonError(message, 500);
  }
}
