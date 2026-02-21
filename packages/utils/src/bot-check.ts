import { isbot } from "isbot";

import { jsonError } from "./http";

export function checkBotProtection(
  request: Request,
  enabled = true,
): Response | null {
  if (!enabled) {
    return null;
  }

  const clientHeader = request.headers.get("user-agent");

  const isbotUserAgent = isbot(clientHeader);

  if (!clientHeader || isbotUserAgent) {
    return jsonError("Invalid client", 403);
  }

  return null;
}
