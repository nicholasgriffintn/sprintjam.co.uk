export interface SlackOAuthAccessResponse {
  ok: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  expires_in?: number;
  refresh_token?: string;
  team?: {
    id?: string;
    name?: string;
  } | null;
  enterprise?: {
    id?: string;
    name?: string;
  } | null;
  authed_user?: {
    id?: string;
  } | null;
  error?: string;
}

export async function exchangeSlackOAuthCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<SlackOAuthAccessResponse> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
  });

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Slack OAuth token exchange failed: ${response.status}`);
  }

  return response.json<SlackOAuthAccessResponse>();
}
