import type { GithubIssue, GithubOAuthCredentials } from "@sprintjam/types";

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

export function escapeGithubSearchValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
    const body = (await response.json()) as {
      message?: string;
      documentation_url?: string;
    };
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

export async function addGithubComment(
  credentials: GithubOAuthCredentials,
  identifier: string,
  commentBody: string,
): Promise<void> {
  const trimmed = commentBody.trim();
  if (!trimmed) {
    return;
  }

  const coords = parseGithubIssueIdentifier(identifier, {
    owner: credentials.defaultOwner ?? credentials.githubLogin ?? undefined,
    repo: credentials.defaultRepo ?? undefined,
  });

  if (!coords.owner || !coords.repo || Number.isNaN(coords.issueNumber)) {
    throw new Error("Invalid GitHub issue identifier");
  }

  await githubRequest(
    credentials.accessToken,
    `/repos/${coords.owner}/${coords.repo}/issues/${coords.issueNumber}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    },
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

export async function fetchGithubRepos(
  credentials: GithubOAuthCredentials,
): Promise<
  Array<{ id: string; name: string; fullName: string; owner: string }>
> {
  const repos: Array<{
    id: string;
    name: string;
    fullName: string;
    owner: string;
  }> = [];
  let page = 1;

  while (true) {
    const response = await githubRequest(
      credentials.accessToken,
      `/user/repos?per_page=100&page=${page}&sort=updated`,
    );
    const data = (await response.json()) as Array<{
      id: number;
      name: string;
      full_name: string;
      owner?: { login?: string };
    }>;

    const pageRepos = data.map((repo) => ({
      id: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login ?? repo.full_name.split("/")[0] ?? "",
    }));

    repos.push(...pageRepos);

    if (data.length < 100) {
      break;
    }
    page += 1;
  }

  return repos;
}

export async function fetchGithubMilestones(
  credentials: GithubOAuthCredentials,
  repository: string,
): Promise<
  Array<{ id: string; number: number; title: string; state?: string }>
> {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid GitHub repository identifier.");
  }

  const milestones: Array<{
    id: string;
    number: number;
    title: string;
    state?: string;
  }> = [];
  let page = 1;

  while (true) {
    const response = await githubRequest(
      credentials.accessToken,
      `/repos/${owner}/${repo}/milestones?state=all&per_page=100&page=${page}`,
    );
    const data = (await response.json()) as Array<{
      id: number;
      number: number;
      title: string;
      state?: string;
    }>;

    milestones.push(
      ...data.map((milestone) => ({
        id: String(milestone.id),
        number: milestone.number,
        title: milestone.title,
        state: milestone.state,
      })),
    );

    if (data.length < 100) {
      break;
    }
    page += 1;
  }

  return milestones;
}

export async function fetchGithubRepoIssues(
  credentials: GithubOAuthCredentials,
  repository: string,
  options: {
    milestoneNumber?: number | null;
    milestoneTitle?: string | null;
    limit?: number | null;
    search?: string | null;
  },
): Promise<GithubIssue[]> {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid GitHub repository identifier.");
  }

  const limit = Math.min(options.limit ?? 50, 100);
  const search = options.search?.trim() ?? "";
  const milestoneTitle = options.milestoneTitle?.trim() ?? "";
  const hasSearch = Boolean(search);

  if (hasSearch) {
    const qualifiers = [`repo:${owner}/${repo}`, "is:issue"];
    if (milestoneTitle) {
      qualifiers.push(
        `milestone:\\"${escapeGithubSearchValue(milestoneTitle)}\\"`,
      );
    }
    if (/^\d+$/.test(search)) {
      qualifiers.push(`number:${search}`);
    } else {
      qualifiers.push(`in:title,body ${search}`);
    }
    const q = qualifiers.join(" ");
    const response = await githubRequest(
      credentials.accessToken,
      `/search/issues?q=${encodeURIComponent(q)}&per_page=${limit}&page=1`,
    );
    const data = (await response.json()) as {
      items?: Array<Record<string, any>>;
    };
    const pageItems = data.items ?? [];
    return pageItems.map((issue) => mapIssueResponse(issue, { owner, repo }));
  }

  const params = new URLSearchParams({
    state: "all",
    per_page: String(limit),
    page: "1",
  });
  if (
    options.milestoneNumber !== undefined &&
    options.milestoneNumber !== null
  ) {
    params.set("milestone", String(options.milestoneNumber));
  }

  const response = await githubRequest(
    credentials.accessToken,
    `/repos/${owner}/${repo}/issues?${params.toString()}`,
  );
  const data = (await response.json()) as Array<Record<string, any>>;

  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => mapIssueResponse(issue, { owner, repo }));
}
