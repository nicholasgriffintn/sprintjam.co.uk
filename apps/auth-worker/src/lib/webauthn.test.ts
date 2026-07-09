import { describe, it, expect } from "vitest";
import { base64UrlToBytes, bytesToBase64Url } from "@sprintjam/utils";

import {
  createWebAuthnRegistrationOptions,
  createWebAuthnAuthenticationOptions,
  verifyWebAuthnAssertion,
} from "./webauthn";

function encodeDerInteger(bytes: Uint8Array): Uint8Array {
  let firstNonZero = 0;
  while (firstNonZero < bytes.length - 1 && bytes[firstNonZero] === 0) {
    firstNonZero++;
  }
  const value = bytes.slice(firstNonZero);
  const needsPositivePrefix = (value[0] & 0x80) !== 0;
  return Uint8Array.from([
    0x02,
    value.length + (needsPositivePrefix ? 1 : 0),
    ...(needsPositivePrefix ? [0] : []),
    ...value,
  ]);
}

function encodeDerEcdsaSignature(signature: Uint8Array): Uint8Array {
  const r = encodeDerInteger(signature.slice(0, signature.length / 2));
  const s = encodeDerInteger(signature.slice(signature.length / 2));
  return Uint8Array.from([0x30, r.length + s.length, ...r, ...s]);
}

function encodeCoseEc2PublicKey(x: Uint8Array, y: Uint8Array): Uint8Array {
  return Uint8Array.from([
    0xa5,
    0x01,
    0x02,
    0x03,
    0x26,
    0x20,
    0x01,
    0x21,
    0x58,
    0x20,
    ...x,
    0x22,
    0x58,
    0x20,
    ...y,
  ]);
}

describe("webauthn helpers", () => {
  it("creates registration options with a challenge", async () => {
    const options = await createWebAuthnRegistrationOptions({
      rpId: "example.com",
      rpName: "Example",
      userId: "user-123",
      userName: "user@example.com",
    });

    expect(options.challenge).toBeTruthy();
    expect(options.rp.name).toBe("Example");
    expect(options.user.name).toBe("user@example.com");
  });

  it("creates authentication options with allow credentials", async () => {
    const options = await createWebAuthnAuthenticationOptions({
      rpId: "example.com",
      allowCredentials: ["dGVzdA"],
    });

    expect(options.challenge).toBeTruthy();
    expect(options.allowCredentials?.length).toBe(1);
  });

  it("verifies an ECDSA WebAuthn assertion", async () => {
    const rpId = "staging.sprintjam.co.uk";
    const origin = `https://${rpId}`;
    const challenge = "dGVzdC1jaGFsbGVuZ2U";
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    if (!publicJwk.x || !publicJwk.y) {
      throw new Error("Generated ECDSA key is missing coordinates");
    }

    const clientDataJSON = new TextEncoder().encode(
      JSON.stringify({ type: "webauthn.get", challenge, origin }),
    );
    const rpIdHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)),
    );
    const authenticatorData = Uint8Array.from([
      ...rpIdHash,
      0x05,
      0x00,
      0x00,
      0x00,
      0x01,
    ]);
    const clientDataHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", clientDataJSON),
    );
    const signatureBase = Uint8Array.from([
      ...authenticatorData,
      ...clientDataHash,
    ]);
    const rawSignature = new Uint8Array(
      await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        keyPair.privateKey,
        signatureBase,
      ),
    );
    const signature =
      rawSignature.length === 64
        ? encodeDerEcdsaSignature(rawSignature)
        : rawSignature;
    const credentialId = "Y3JlZGVudGlhbC1pZA";
    const publicKey = encodeCoseEc2PublicKey(
      base64UrlToBytes(publicJwk.x),
      base64UrlToBytes(publicJwk.y),
    );

    await expect(
      verifyWebAuthnAssertion({
        response: {
          id: credentialId,
          rawId: credentialId,
          type: "public-key",
          clientExtensionResults: {},
          response: {
            clientDataJSON: bytesToBase64Url(clientDataJSON),
            authenticatorData: bytesToBase64Url(authenticatorData),
            signature: bytesToBase64Url(signature),
          },
        },
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRpId: rpId,
        credential: {
          id: credentialId,
          publicKey: bytesToBase64Url(publicKey),
          counter: 0,
        },
      }),
    ).resolves.toEqual({ counter: 1 });
  });
});
