import type { AuthWorkerEnv } from "@sprintjam/types";
import { safeJsonParse } from "@sprintjam/utils";

import { requestWithJsonBody } from "../../lib/request";
import { jsonError } from "../../lib/response";
import { adaptAuthUiClientResponse } from "./auth-ui-response";
import {
  readAuthUiRequest,
  type SupportedAuthUiRequest,
} from "./auth-ui-request";
import {
  requestMagicLinkController,
  verifyCodeController,
} from "./magic-link-controller";
import {
  startMfaSetupController,
  verifyMfaSetupController,
} from "./mfa-setup-controller";
import {
  startMfaVerifyController,
  verifyMfaController,
} from "./mfa-verify-controller";

export async function authUiController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const authRequest = readAuthUiRequest(await request.json());
  if (!authRequest) {
    return jsonError(
      "This authentication action is not supported.",
      400,
      "unsupported_auth_action",
    );
  }

  const response =
    authRequest.action === "request_magic_link"
      ? await requestMagicLinkController(
          requestWithJsonBody(request, { email: authRequest.values.email }),
          env,
        )
      : await continueAuth(request, env, authRequest);
  return adaptAuthUiClientResponse(response);
}

async function continueAuth(
  request: Request,
  env: AuthWorkerEnv,
  authRequest: Extract<SupportedAuthUiRequest, { action: "continue" }>,
): Promise<Response> {
  const token = authRequest.continuationToken;
  const values = authRequest.values;

  if (authRequest.kind === "email_otp") {
    return verifyCodeController(
      requestWithJsonBody(request, {
        challengeToken: token,
        code: values["code"],
      }),
      env,
    );
  }
  if (authRequest.kind === "mfa_selection") {
    const body = {
      challengeToken: token,
      method: values["challenge"],
    };
    return values["mode"] === "setup"
      ? startMfaSetupController(requestWithJsonBody(request, body), env)
      : startMfaVerifyController(requestWithJsonBody(request, body), env);
  }
  if (authRequest.kind === "mfa_setup") {
    return verifyMfaSetupController(
      requestWithJsonBody(request, {
        challengeToken: token,
        selectionToken: values["selectionToken"],
        method: "totp",
        code: values["code"],
      }),
      env,
    );
  }
  if (authRequest.kind === "software_token_mfa") {
    return verifyMfaController(
      requestWithJsonBody(request, {
        challengeToken: token,
        method: "totp",
        code: values["code"],
      }),
      env,
    );
  }
  if (authRequest.kind === "webauthn") {
    return continueWebAuthn(request, env, token, values);
  }
  return jsonError(
    "This authentication challenge is not supported.",
    400,
    "unsupported_auth_challenge",
  );
}

function continueWebAuthn(
  request: Request,
  env: AuthWorkerEnv,
  challengeToken: string,
  values: Readonly<Record<string, string>>,
): Promise<Response> {
  const credentialValue = values["credential"];
  const credential = credentialValue
    ? safeJsonParse<unknown>(credentialValue, { silent: true })
    : undefined;
  if (!credential) {
    return Promise.resolve(
      jsonError(
        "WebAuthn credential is required",
        400,
        "webauthn_credential_required",
      ),
    );
  }
  if (values["ceremony"] === "registration") {
    return verifyMfaSetupController(
      requestWithJsonBody(request, {
        challengeToken,
        selectionToken: values["selectionToken"],
        method: "webauthn",
        credential,
      }),
      env,
    );
  }
  return verifyMfaController(
    requestWithJsonBody(request, {
      challengeToken,
      method: "webauthn",
      credential,
    }),
    env,
  );
}
