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
