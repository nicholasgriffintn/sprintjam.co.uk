const encoder = new TextEncoder();

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPasscode(passcode: string): Promise<string> {
  const encoded = encoder.encode(passcode.trim());
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bufferToHex(digest);
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export const SESSION_TOKEN_TTL_MS = 1000 * 60 * 60 * 6;

export async function signState(data: any, secret: string): Promise<string> {
  const json = JSON.stringify(data);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(json));
  const signatureHex = bufferToHex(signature);
  return btoa(JSON.stringify({ data, signature: signatureHex }));
}

export async function verifyState(state: string, secret: string): Promise<any> {
  try {
    const { data, signature } = JSON.parse(atob(state));
    const json = JSON.stringify(data);
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const computedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(json),
    );
    const computedSignatureHex = bufferToHex(computedSignature);

    if (computedSignatureHex !== signature) {
      throw new Error("Invalid state signature");
    }
    return data;
  } catch (e) {
    throw new Error("Invalid state");
  }
}

export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
