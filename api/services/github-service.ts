import type { GithubIssue, GithubOAuthCredentials } from "../types";

class GithubIdentifierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubIdentifierError";
  }
}

interface GithubIssueCoordinates {
  owner: string;
  repo: string;
  issueNumber: number;
}

function parseGithubIssueIdentifier(
  identifier: string,
  defaults?: { owner?: string | null; repo?: string | null },
): GithubIssueCoordinates {
  const value = identifier.trim();
  if (!value) {
    throw new GithubIdentifierError(
      "Provide an issue key like owner/repo#123.",
    );
  }

  if (value.startsWith("http")) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      const issueIdx = parts.findIndex((segment) => segment === "issues");
      if (issueIdx >= 2 && parts[issueIdx + 1]) {
        return {
          owner: parts[issueIdx - 2],
          repo: parts[issueIdx - 1],
          issueNumber: Number(parts[issueIdx + 1]),
        };
      }
    } catch (error) {
      throw new GithubIdentifierError(
        "Unsupported GitHub issue URL. Use https://github.com/owner/repo/issues/123.",
      );
    }
  }

  const hashMatch = value.match(/^([^/]+)\/([^#]+)#(\d+)$/);
  if (hashMatch) {
    return {
      owner: hashMatch[1],
      repo: hashMatch[2],
      issueNumber: Number(hashMatch[3]),
    };
  }

  const defaultOwner = defaults?.owner ?? null;
  const defaultRepo = defaults?.repo ?? null;

  const repoMatch = value.match(/^([^#]+)#(\d+)$/);
  if (repoMatch && defaultOwner) {
    return {
      owner: defaultOwner,
      repo: repoMatch[1],
      issueNumber: Number(repoMatch[2]),
    };
  }

  const numberOnly = value.match(/^\d+$/);
  if (numberOnly && defaultOwner && defaultRepo) {
    return {
      owner: defaultOwner,
      repo: defaultRepo,
      issueNumber: Number(numberOnly[0]),
    };
  }

  throw new GithubIdentifierError(
    defaultOwner && defaultRepo
      ? "Use owner/repo#123 or #123 for your default repository."
      : "Use owner/repo#123 or a GitHub issue URL.",
  );
}

async function handleGithubError(response: Response): Promise<never> {
  let message = `GitHub API request failed: ${response.status}`;
  try {
    const body = await response.json<{
      message?: string;
      documentation_url?: string;
    }>();
    if (body.message) {
      message = body.message;
    }
  } catch {
    // ignore JSON parse errors
  }

  throw new Error(message);
}

function mapIssueResponse(
  data: any,
  repoCoordinates: { owner: string; repo: string },
): GithubIssue {
  if (!data || typeof data !== "object") {
    throw new Error("Unexpected response when reading GitHub issue");
  }

  const labels = Array.isArray(data.labels)
    ? data.labels
        .map((label: { name?: string }) => label?.name)
        .filter((name: unknown): name is string => typeof name === "string")
    : [];

  return {
    id: String(
      data.id ??
        `${repoCoordinates.owner}/${repoCoordinates.repo}#${data.number}`,
    ),
    key: `${repoCoordinates.owner}/${repoCoordinates.repo}#${data.number}`,
    repository: `${repoCoordinates.owner}/${repoCoordinates.repo}`,
    number: Number(data.number ?? 0),
    title: data.title ?? "",
    description: data.body ?? undefined,
    status: data.state ?? undefined,
    assignee: data.assignee?.login ?? data.user?.login ?? undefined,
    estimate: null,
    url: data.html_url ?? undefined,
    labels,
  };
}

async function githubRequest(
  accessToken: string,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "SprintJam",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    await handleGithubError(response);
  }

  return response;
}

export async function fetchGithubIssue(
  credentials: GithubOAuthCredentials,
  identifier: string,
): Promise<GithubIssue> {
  const coords = parseGithubIssueIdentifier(identifier, {
    owner: credentials.defaultOwner ?? credentials.githubLogin ?? undefined,
    repo: credentials.defaultRepo ?? undefined,
  });

  if (!coords.owner || !coords.repo || Number.isNaN(coords.issueNumber)) {
    throw new Error("Invalid GitHub issue identifier");
  }

  const issueResponse = await githubRequest(
    credentials.accessToken,
    `/repos/${coords.owner}/${coords.repo}/issues/${coords.issueNumber}`,
  );
  const data = await issueResponse.json();

  return mapIssueResponse(data, coords);
}

export async function updateGithubEstimate(
  credentials: GithubOAuthCredentials,
  identifier: string,
  estimate: number,
): Promise<GithubIssue> {
  const coords = parseGithubIssueIdentifier(identifier, {
    owner: credentials.defaultOwner ?? credentials.githubLogin ?? undefined,
    repo: credentials.defaultRepo ?? undefined,
  });

  if (!coords.owner || !coords.repo || Number.isNaN(coords.issueNumber)) {
    throw new Error("Invalid GitHub issue identifier");
  }

  const commentBody = `SprintJam estimate updated to **${estimate}** story points.`;
  await githubRequest(
    credentials.accessToken,
    `/repos/${coords.owner}/${coords.repo}/issues/${coords.issueNumber}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    },
  );

  return fetchGithubIssue(
    credentials,
    `${coords.owner}/${coords.repo}#${coords.issueNumber}`,
  );
}

export async function createGithubIssue(options: {
  accessToken: string;
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels: string[];
}): Promise<GithubIssue> {
  const { accessToken, owner, repo, title, body, labels } = options;
  const uniqueLabels = Array.from(
    new Set(labels.map((label) => label.trim()).filter(Boolean)),
  );

  const issueResponse = await githubRequest(
    accessToken,
    `/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        labels: uniqueLabels,
      }),
    },
  );

  const data = await issueResponse.json();
  return mapIssueResponse(data, { owner, repo });
}
