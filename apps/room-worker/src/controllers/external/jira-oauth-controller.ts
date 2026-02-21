import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv, JiraFieldDefinition } from "@sprintjam/types";
import {
  jsonError,
  getRoomStub,
  signState,
  verifyState,
  generateID,
  getRoomSessionToken,
  checkBotProtection,
} from "@sprintjam/utils";
import {
  fetchJiraFields,
  findDefaultSprintField,
  findDefaultStoryPointsField,
} from "@sprintjam/services";

import { checkOAuthRateLimit } from "../../lib/rate-limit";
import { jsonResponse } from "../../lib/response";
import {
  fetchOAuthStatus,
  oauthHtmlErrorResponse,
  oauthHtmlSuccessResponse,
  revokeOAuthCredentials,
  validateSession,
} from "./shared";

export async function initiateJiraOAuthController(
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

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const redirectUri =
      env.JIRA_OAUTH_REDIRECT_URI ||
      "https://sprintjam.co.uk/api/jira/oauth/callback";

    if (!clientId || !env.JIRA_OAUTH_CLIENT_SECRET) {
      return jsonError(
        "OAuth not configured. Please contact administrator.",
        500,
      );
    }

    const state = await signState(
      { roomKey, userName, nonce: generateID() },
      env.JIRA_OAUTH_CLIENT_SECRET,
    );

    const authUrl = new URL("https://auth.atlassian.com/authorize");
    authUrl.searchParams.set("audience", "api.atlassian.com");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set(
      "scope",
      "read:jira-work write:jira-work read:board-scope:jira-software read:project:jira read:sprint:jira-software read:issue-details:jira read:jql:jira read:jira-user offline_access",
    );
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("prompt", "consent");

    return jsonResponse({ authorizationUrl: authUrl.toString(), state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initiate OAuth";
    return jsonError(message, 500);
  }
}

export async function handleJiraOAuthCallbackController(
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
    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;
    const redirectUri =
      env.JIRA_OAUTH_REDIRECT_URI ||
      "https://sprintjam.co.uk/api/jira/oauth/callback";

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
      "https://auth.atlassian.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return oauthHtmlErrorResponse("Failed to exchange code for token", 500);
    }

    const tokenData = await tokenResponse.json<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
    }>();

    const resourcesResponse = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      },
    );

    if (!resourcesResponse.ok) {
      return oauthHtmlErrorResponse("Failed to fetch Jira resources", 500);
    }

    const resources = await resourcesResponse.json<
      Array<{
        id: string;
        url: string;
        name: string;
        scopes: string[];
      }>
    >();

    if (resources.length === 0) {
      return oauthHtmlErrorResponse("No Jira sites accessible", 400);
    }
    const requiredScopes = [
      "read:board-scope:jira-software",
      "read:sprint:jira-software",
      "read:issue-details:jira",
    ];
    const jiraResource =
      resources.find((resource) =>
        requiredScopes.every((scope) => resource.scopes.includes(scope)),
      ) ?? resources[0];
    const jiraDomain = new URL(jiraResource.url).hostname;

    const userResponse = await fetch(
      `https://api.atlassian.com/ex/jira/${jiraResource.id}/rest/api/3/myself`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      },
    );

    let jiraUserEmail: string | null = null;
    let jiraUserId: string | null = null;
    if (userResponse.ok) {
      const userData = await userResponse.json<{
        accountId: string;
        emailAddress?: string;
      }>();
      jiraUserId = userData.accountId;
      jiraUserEmail = userData.emailAddress || null;
    }

    let storyPointsField: string | null = null;
    let sprintField: string | null = null;

    try {
      const fieldsResponse = await fetch(
        `https://api.atlassian.com/ex/jira/${jiraResource.id}/rest/api/3/field`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/json",
          },
        },
      );

      if (fieldsResponse.ok) {
        const fields = (await fieldsResponse.json()) as JiraFieldDefinition[];
        storyPointsField = findDefaultStoryPointsField(fields);
        sprintField = findDefaultSprintField(fields);
      }
    } catch (fieldError) {
      console.error("Failed to pre-select Jira fields", fieldError);
    }

    const roomObject = getRoomStub(env, roomKey);
    const saveResponse = await roomObject.fetch(
      new Request("https://internal/jira/oauth/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenType: tokenData.token_type,
          expiresAt: Date.now() + tokenData.expires_in * 1000,
          scope: tokenData.scope,
          jiraDomain,
          jiraCloudId: jiraResource.id,
          jiraUserId,
          jiraUserEmail,
          authorizedBy: userName,
          storyPointsField,
          sprintField,
        }),
      }) as unknown as CfRequest,
    );

    if (!saveResponse.ok) {
      return oauthHtmlErrorResponse("Failed to save credentials", 500);
    }

    return oauthHtmlSuccessResponse(
      "Jira connected successfully. You can close this window.",
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return oauthHtmlErrorResponse(message, 500);
  }
}

export async function getJiraOAuthStatusController(
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
    const data = await fetchOAuthStatus<{
      connected: boolean;
      jiraDomain?: string;
      jiraUserEmail?: string;
      expiresAt?: number;
      storyPointsField?: string | null;
      sprintField?: string | null;
    }>(roomObject, "jira", { roomKey, userName, sessionToken });

    return jsonResponse(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get OAuth status";
    return jsonError(message, 500);
  }
}

export async function revokeJiraOAuthController(
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

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    if (!clientId) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request("https://internal/jira/oauth/credentials", {
        method: "GET",
      }) as unknown as CfRequest,
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        "Jira not connected. Please connect your Jira account.",
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
        "https://auth.atlassian.com/oauth/revoke",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: tokenToRevoke,
            client_id: clientId,
          }),
        },
      );

      if (!revokeResponse.ok) {
        const errorBody = await revokeResponse.text().catch(() => "");
        console.error("Failed to revoke Jira token:", errorBody);
        return jsonError("Failed to revoke Jira token with Atlassian.", 502);
      }
    }

    await revokeOAuthCredentials(roomObject, "jira", {
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

export async function getJiraFieldsController(
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

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request("https://internal/jira/oauth/credentials", {
        method: "GET",
      }) as unknown as CfRequest,
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        "Jira not connected. Please connect your Jira account in settings.",
        401,
      );
    }

    const { credentials } = await credentialsResponse.json<{
      credentials: {
        id: number;
        roomKey: string;
        accessToken: string;
        refreshToken: string | null;
        tokenType: string;
        expiresAt: number;
        scope: string | null;
        jiraDomain: string;
        jiraCloudId: string | null;
        jiraUserId: string | null;
        jiraUserEmail: string | null;
        storyPointsField: string | null;
        sprintField: string | null;
        authorizedBy: string;
        createdAt: number;
        updatedAt: number;
      };
    }>();

    const onTokenRefresh = async (
      accessToken: string,
      refreshToken: string,
      expiresAt: number,
    ) => {
      await roomObject.fetch(
        new Request("https://internal/jira/oauth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest,
      );
    };

    const fields = await fetchJiraFields(
      credentials,
      onTokenRefresh,
      clientId,
      clientSecret,
    );

    const simplifiedFields = fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.schema?.type ?? field.schema?.system ?? null,
      custom: !!field.schema?.custom,
    }));

    return jsonResponse({
      fields: simplifiedFields,
      storyPointsField: credentials.storyPointsField,
      sprintField: credentials.sprintField,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Jira fields";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}

export async function updateJiraFieldsController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    roomKey?: string;
    userName?: string;
    storyPointsField?: string | null;
    sprintField?: string | null;
  }>();

  const roomKey = body?.roomKey;
  const userName = body?.userName;
  const { storyPointsField, sprintField } = body;

  const sessionToken = getRoomSessionToken(request);

  if (!roomKey || !userName) {
    return jsonError("Room key and user name are required");
  }

  if (storyPointsField === undefined && sprintField === undefined) {
    return jsonError("No field updates provided", 400);
  }

  try {
    await validateSession(env, roomKey, userName, sessionToken);

    const clientId = env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = env.JIRA_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return jsonError("Jira OAuth not configured", 500);
    }

    const roomObject = getRoomStub(env, roomKey);
    const credentialsResponse = await roomObject.fetch(
      new Request("https://internal/jira/oauth/credentials", {
        method: "GET",
      }) as unknown as CfRequest,
    );

    if (!credentialsResponse.ok) {
      return jsonError(
        "Jira not connected. Please connect your Jira account in settings.",
        401,
      );
    }

    const { credentials } = await credentialsResponse.json<{
      credentials: {
        id: number;
        roomKey: string;
        accessToken: string;
        refreshToken: string | null;
        tokenType: string;
        expiresAt: number;
        scope: string | null;
        jiraDomain: string;
        jiraCloudId: string | null;
        jiraUserId: string | null;
        jiraUserEmail: string | null;
        storyPointsField: string | null;
        sprintField: string | null;
        authorizedBy: string;
        createdAt: number;
        updatedAt: number;
      };
    }>();

    const onTokenRefresh = async (
      accessToken: string,
      refreshToken: string,
      expiresAt: number,
    ) => {
      await roomObject.fetch(
        new Request("https://internal/jira/oauth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
        }) as unknown as CfRequest,
      );
    };

    const fields = await fetchJiraFields(
      credentials,
      onTokenRefresh,
      clientId,
      clientSecret,
    );
    const validFieldIds = new Set(fields.map((field) => field.id));

    if (storyPointsField && !validFieldIds.has(storyPointsField)) {
      return jsonError(
        "Selected story points field is not available in Jira",
        400,
      );
    }

    if (sprintField && !validFieldIds.has(sprintField)) {
      return jsonError("Selected sprint field is not available in Jira", 400);
    }

    const updateResponse = await roomObject.fetch(
      new Request("https://internal/jira/oauth/fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyPointsField, sprintField }),
      }) as unknown as CfRequest,
    );

    if (!updateResponse.ok) {
      return jsonError("Failed to save Jira field configuration", 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update Jira field configuration";
    const isAuth =
      message.toLowerCase().includes("session") ||
      message.toLowerCase().includes("oauth") ||
      message.toLowerCase().includes("reconnect");
    return jsonError(message, isAuth ? 401 : 500);
  }
}
