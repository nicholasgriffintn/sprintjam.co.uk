import { isAllowedOrigin } from "@sprintjam/utils";

export function resolveSprintJamAppOrigin(
  request: Request,
  environment?: string,
): string {
  const requestOrigin = new URL(request.url).origin;
  if (isAllowedOrigin(requestOrigin, environment === "development")) {
    return requestOrigin;
  }

  return "https://sprintjam.co.uk";
}
