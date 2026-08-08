import type { AuthWorkerEnv } from "@sprintjam/types";

import { jsonError } from "../../lib/response";
import { adaptAuthUiClientResponse } from "./auth-ui-response";
import {
  controllerRequest,
  readAuthUiRequest,
  readCredential,
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
          controllerRequest(request, { email: authRequest.values.email }),
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
      controllerRequest(request, {
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
      ? startMfaSetupController(controllerRequest(request, body), env)
      : startMfaVerifyController(controllerRequest(request, body), env);
  }
  if (authRequest.kind === "mfa_setup") {
    return verifyMfaSetupController(
      controllerRequest(request, {
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
      controllerRequest(request, {
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
  const credential = readCredential(values["credential"]);
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
      controllerRequest(request, {
        challengeToken,
        selectionToken: values["selectionToken"],
        method: "webauthn",
        credential,
      }),
      env,
    );
  }
  return verifyMfaController(
    controllerRequest(request, {
      challengeToken,
      method: "webauthn",
      credential,
    }),
    env,
  );
}
