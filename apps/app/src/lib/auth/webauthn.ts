import { base64UrlToBuffer, bufferToBase64Url } from "@sprintjam/utils";

import type {
  WebAuthnAuthenticationOptions,
  WebAuthnCredential,
  WebAuthnRegistrationOptions,
} from "@/lib/workspace-service";

export { base64UrlToBuffer };

function isAttestationResponse(
  response: AuthenticatorResponse,
): response is AuthenticatorAttestationResponse {
  return "attestationObject" in response;
}

function isAssertionResponse(
  response: AuthenticatorResponse,
): response is AuthenticatorAssertionResponse {
  return "authenticatorData" in response;
}

export function buildRegistrationOptions(
  options: WebAuthnRegistrationOptions,
): PublicKeyCredentialCreationOptions {
  return {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64UrlToBuffer(options.user.id),
    },
  };
}

export function buildAuthenticationOptions(
  options: WebAuthnAuthenticationOptions,
): PublicKeyCredentialRequestOptions {
  return {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: options.allowCredentials.map((cred) => ({
      ...cred,
      id: base64UrlToBuffer(cred.id),
    })),
  };
}

export function toWebAuthnCredential(
  credential: PublicKeyCredential,
): WebAuthnCredential {
  if (credential.type !== "public-key") {
    throw new Error("Unsupported WebAuthn credential type");
  }
  const response = credential.response;
  const payload: WebAuthnCredential = {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: "public-key",
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    },
  };

  if (isAttestationResponse(response)) {
    payload.response.attestationObject = bufferToBase64Url(
      response.attestationObject,
    );
  }

  if (isAssertionResponse(response)) {
    payload.response.authenticatorData = bufferToBase64Url(
      response.authenticatorData,
    );
    payload.response.signature = bufferToBase64Url(response.signature);
    if (response.userHandle) {
      payload.response.userHandle = bufferToBase64Url(response.userHandle);
    }
  }

  return payload;
}
