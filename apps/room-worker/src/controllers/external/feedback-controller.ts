import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";
import { createGithubIssue } from "@sprintjam/services";
import {
  FEEDBACK_GITHUB_OWNER,
  FEEDBACK_GITHUB_REPO,
  FEEDBACK_GITHUB_DEFAULT_LABELS,
} from "@sprintjam/utils/constants";
import { jsonError, jsonResponse } from "../../lib/response";

const ALLOWED_FEEDBACK_LABELS = new Set([
  "bug",
  "enhancement",
  "question",
  "ui-ux",
  "performance",
  "docs",
]);

function normalize(label: string): string {
  return label.trim().toLowerCase();
}

export async function submitFeedbackController(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  if (!env.FEEDBACK_RATE_LIMITER) {
    console.error(
      "Rate limiters are not configured but rate limiting is enabled",
    );
    return jsonError("Service temporarily unavailable", 503);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const { success: rateLimitSuccess } = await env.FEEDBACK_RATE_LIMITER.limit({
    key: `feedback:ip:${ip}`,
  });

  if (!rateLimitSuccess) {
    return jsonError(
      "Rate limit exceeded. Please wait before submitting more feedback.",
      429,
    );
  }

  let body: {
    title?: string;
    description?: string;
    labels?: unknown;
    email?: string;
    pageUrl?: string;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.trim() : "";

  if (!title) {
    return jsonError("Title is required");
  }

  if (!description) {
    return jsonError("Description is required");
  }
  const baseLabels = FEEDBACK_GITHUB_DEFAULT_LABELS;

  const allowedLabels = new Set([
    ...ALLOWED_FEEDBACK_LABELS,
    ...baseLabels.map(normalize),
  ]);

  const rawLabels = Array.isArray(body.labels)
    ? body.labels
    : typeof body.labels === "string"
      ? [body.labels]
      : [];

  const providedLabels = rawLabels
    .filter((label): label is string => typeof label === "string")
    .map((label) => label.trim())
    .filter(Boolean);

  const sanitizedProvided = providedLabels.filter((label) =>
    allowedLabels.has(normalize(label)),
  );

  if (sanitizedProvided.length === 0) {
    return jsonError("At least one valid label is required");
  }

  const labelMap = new Map<string, string>();
  [...baseLabels, ...sanitizedProvided].forEach((label) => {
    const key = normalize(label);
    if (!labelMap.has(key)) {
      labelMap.set(key, label);
    }
  });
  const labels = Array.from(labelMap.values());

  const accessToken = env.FEEDBACK_GITHUB_TOKEN;
  const owner = FEEDBACK_GITHUB_OWNER;
  const repo = FEEDBACK_GITHUB_REPO;

  if (!accessToken) {
    return jsonError("Feedback submissions are temporarily unavailable", 503);
  }

  const details: string[] = [];
  details.push(description);
  details.push("");
  details.push("---");
  details.push("Submitted via SprintJam feedback form.");
  details.push(`Contact: ${email || "not provided"}`);
  if (pageUrl) {
    details.push(`Page: ${pageUrl}`);
  }

  try {
    const issue = await createGithubIssue({
      accessToken,
      owner,
      repo,
      title,
      body: details.join("\n"),
      labels,
    });

    return jsonResponse({ issue }, 201);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit feedback to GitHub";
    return jsonError(message, 500);
  }
}
