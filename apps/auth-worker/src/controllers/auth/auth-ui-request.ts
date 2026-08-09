import {
  AuthProtocolError,
  parseAuthRequest,
  type AuthRequest,
} from "@ngriffin_uk/auth-protocol";

export type SupportedAuthUiRequest = Extract<
  AuthRequest,
  { readonly action: "request_magic_link" | "continue" }
>;

export function readAuthUiRequest(
  value: unknown,
): SupportedAuthUiRequest | undefined {
  try {
    const request = parseAuthRequest(value, {
      allowedActions: ["request_magic_link", "continue"],
    });
    return request.action === "request_magic_link" ||
      request.action === "continue"
      ? request
      : undefined;
  } catch (error) {
    if (error instanceof AuthProtocolError) return undefined;
    throw error;
  }
}
