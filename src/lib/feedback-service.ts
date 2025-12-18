import { API_BASE_URL } from "@/constants";
import type { GithubIssue } from "@/types";

export interface FeedbackPayload {
  title: string;
  description: string;
  labels: string[];
  email?: string;
  pageUrl?: string;
}

export async function submitFeedback(
  payload: FeedbackPayload,
): Promise<GithubIssue> {
  const response = await fetch(`${API_BASE_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      (errorData as { error?: string }).error ||
      `Failed to submit feedback (${response.status})`;
    throw new Error(message);
  }

  const data = (await response.json()) as { issue?: GithubIssue };
  if (!data.issue) {
    throw new Error("Invalid response from feedback endpoint");
  }

  return data.issue;
}
