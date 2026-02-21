import type { LinearOAuthCredentials } from "@sprintjam/types";
import { executeWithTokenRefresh as executeWithOAuthTokenRefresh } from "./oauth-refresh";

type TicketMetadata = Record<string, any>;

type LinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  estimate?: number;
  url: string;
  state?: { name: string };
  assignee?: { name: string };
};

type LinearTeam = {
  id: string;
  name: string;
  key: string;
};

type LinearCycle = {
  id: string;
  number: number;
  name?: string;
  startsAt?: string | null;
  endsAt?: string | null;
};

function getOAuthHeaders(accessToken: string): Headers {
  return new Headers({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  });
}

async function refreshOAuthToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Token refresh failed:", errorData);
    throw new Error(
      "Failed to refresh OAuth token. User needs to re-authenticate.",
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

async function executeWithTokenRefresh<T>(
  credentials: LinearOAuthCredentials,
  operation: (accessToken: string) => Promise<T>,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<T> {
  return executeWithOAuthTokenRefresh({
    credentials,
    operation,
    onTokenRefresh,
    refreshToken: (refreshToken) =>
      refreshOAuthToken(refreshToken, clientId, clientSecret),
    reconnectErrorMessage:
      "OAuth token expired. Please reconnect your Linear account.",
  });
}

async function executeGraphQL<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const headers = getOAuthHeaders(accessToken);
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("401: Unauthorized");
    }
    const bodyText = await response.text();
    throw new Error(
      `Linear API request failed: ${response.status} ${bodyText}`.trim(),
    );
  }

  const data = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (data.errors && data.errors.length > 0) {
    throw new Error(data.errors[0].message);
  }

  if (!data.data) {
    throw new Error("No data returned from Linear API");
  }

  return data.data;
}

function mapIssueToTicket(issue: LinearIssue): TicketMetadata {
  return {
    id: issue.id,
    key: issue.identifier,
    summary: issue.title,
    description: issue.description || "",
    status: issue.state?.name || "Unknown",
    assignee: issue.assignee?.name || null,
    storyPoints: issue.estimate ?? null,
    url: issue.url,
  };
}

function parseLinearIssueNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let index = trimmed.length - 1;
  while (index >= 0 && trimmed[index] >= "0" && trimmed[index] <= "9") {
    index -= 1;
  }

  if (index === trimmed.length - 1) {
    return null;
  }

  const parsed = Number(trimmed.slice(index + 1));
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchIssueById(
  accessToken: string,
  issueId: string,
): Promise<LinearIssue | null> {
  const query = `
    query GetIssue($issueId: String!) {
      issue(id: $issueId) {
        id
        identifier
        title
        description
        estimate
        url
        state {
          name
        }
        assignee {
          name
        }
      }
    }
  `;

  try {
    const data = await executeGraphQL<{
      issue: LinearIssue | null;
    }>(accessToken, query, { issueId });
    return data.issue ?? null;
  } catch (error) {
    console.warn(
      "Linear issue lookup by id failed; will try identifier",
      error,
    );
    return null;
  }
}

async function fetchIssueByIdentifier(
  accessToken: string,
  identifier: string,
): Promise<LinearIssue | null> {
  const issueNumber = parseLinearIssueNumber(identifier);
  if (issueNumber === null) {
    return null;
  }
  const query = `
    query IssueByNumber($issueNumber: Int!) {
      issues(filter: { number: { eq: $issueNumber } }, first: 1) {
        nodes {
          id
          identifier
          title
          description
          estimate
          url
          state {
            name
          }
          assignee {
            name
          }
        }
      }
    }
  `;

  const data = await executeGraphQL<{
    issues: { nodes: LinearIssue[] };
  }>(accessToken, query, { issueNumber });

  return data.issues?.nodes?.[0] ?? null;
}

async function resolveIssueByIdOrIdentifier(
  accessToken: string,
  issueRef: string,
): Promise<LinearIssue | null> {
  const byId = await fetchIssueById(accessToken, issueRef);
  if (byId) {
    return byId;
  }

  return await fetchIssueByIdentifier(accessToken, issueRef);
}

export async function fetchLinearIssue(
  credentials: LinearOAuthCredentials,
  issueId: string,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<TicketMetadata> {
  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const issue =
        (await resolveIssueByIdOrIdentifier(accessToken, issueId)) ?? null;

      if (!issue) {
        throw new Error("Linear issue not found. Verify the issue key or id.");
      }

      return mapIssueToTicket(issue);
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}

export async function updateLinearEstimate(
  credentials: LinearOAuthCredentials,
  issueId: string,
  estimate: number,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<TicketMetadata> {
  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const estimateInt = Math.round(estimate);

      const issue =
        (await resolveIssueByIdOrIdentifier(accessToken, issueId)) ?? null;

      if (!issue) {
        throw new Error("Linear issue not found. Verify the issue key or id.");
      }

      const mutation = `
        mutation UpdateIssue($issueId: String!, $estimate: Int) {
          issueUpdate(
            id: $issueId
            input: { estimate: $estimate }
          ) {
            success
            issue {
              id
              identifier
              title
              description
              estimate
              url
              state {
                name
              }
              assignee {
                name
              }
            }
          }
        }
      `;

      const data = await executeGraphQL<{
        issueUpdate: {
          success: boolean;
          issue: LinearIssue;
        };
      }>(accessToken, mutation, {
        issueId: issue.id,
        estimate: estimateInt,
      });

      if (!data.issueUpdate.success) {
        throw new Error("Failed to update Linear issue estimate");
      }

      return mapIssueToTicket(data.issueUpdate.issue);
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}

export async function addLinearComment(
  credentials: LinearOAuthCredentials,
  issueId: string,
  comment: string,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<void> {
  const trimmed = comment.trim();
  if (!trimmed) {
    return;
  }

  await executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const issue =
        (await resolveIssueByIdOrIdentifier(accessToken, issueId)) ?? null;

      if (!issue) {
        throw new Error("Linear issue not found. Verify the issue key or id.");
      }

      const mutation = `
        mutation CommentCreate($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            success
          }
        }
      `;

      const data = await executeGraphQL<{
        commentCreate: {
          success: boolean;
        };
      }>(accessToken, mutation, {
        issueId: issue.id,
        body: trimmed,
      });

      if (!data.commentCreate.success) {
        throw new Error("Failed to add Linear comment");
      }
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}

export async function getLinearOrganization(accessToken: string): Promise<{
  id: string;
  name: string;
}> {
  const query = `
    query {
      organization {
        id
        name
      }
    }
  `;

  const data = await executeGraphQL<{
    organization: {
      id: string;
      name: string;
    };
  }>(accessToken, query);

  return data.organization;
}

export async function getLinearViewer(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
}> {
  const query = `
    query {
      viewer {
        id
        email
        name
      }
    }
  `;

  const data = await executeGraphQL<{
    viewer: {
      id: string;
      email: string;
      name: string;
    };
  }>(accessToken, query);

  return data.viewer;
}

export async function fetchLinearTeams(
  credentials: LinearOAuthCredentials,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<LinearTeam[]> {
  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const query = `
        query {
          teams {
            nodes {
              id
              name
              key
            }
          }
        }
      `;

      const data = await executeGraphQL<{ teams: { nodes: LinearTeam[] } }>(
        accessToken,
        query,
      );

      return data.teams.nodes ?? [];
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}

export async function fetchLinearCycles(
  credentials: LinearOAuthCredentials,
  teamId: string,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<LinearCycle[]> {
  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const query = `
        query GetCycles($teamId: String!) {
          team(id: $teamId) {
            cycles(first: 50) {
              nodes {
                id
                number
                name
                startsAt
                endsAt
              }
            }
          }
        }
      `;

      const data = await executeGraphQL<{
        team: { cycles: { nodes: LinearCycle[] } } | null;
      }>(accessToken, query, { teamId });

      return data.team?.cycles?.nodes ?? [];
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}

export async function fetchLinearIssues(
  credentials: LinearOAuthCredentials,
  teamId: string,
  options: {
    cycleId?: string | null;
    limit?: number | null;
    search?: string | null;
  },
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<TicketMetadata[]> {
  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const limit = options.limit ?? 250;
      const hasCycle = Boolean(options.cycleId);
      const search = options.search?.trim() ?? "";
      const hasSearch = Boolean(search);
      const issueNumber = parseLinearIssueNumber(search);
      const hasIssueNumber = issueNumber !== null;
      const query = `
        query GetIssues($teamId: ID!, $limit: Int!${
          hasCycle ? ", $cycleId: ID!" : ""
        }${hasSearch ? ", $search: String!" : ""}${
          hasIssueNumber ? ", $issueNumber: Int!" : ""
        }) {
          issues(
            first: $limit
            filter: {
              team: { id: { eq: $teamId } }
              ${hasCycle ? "cycle: { id: { eq: $cycleId } }" : ""}
              ${
                hasSearch
                  ? `or: [{ title: { containsIgnoreCase: $search } }, { description: { containsIgnoreCase: $search } }${
                      hasIssueNumber ? ", { number: { eq: $issueNumber } }" : ""
                    }]`
                  : ""
              }
            }
          ) {
            nodes {
              id
              identifier
              title
              description
              estimate
              url
              state {
                name
              }
              assignee {
                name
              }
            }
          }
        }
      `;

      const data = await executeGraphQL<{
        issues: { nodes: LinearIssue[] };
      }>(accessToken, query, {
        teamId,
        ...(hasCycle ? { cycleId: options.cycleId } : {}),
        ...(hasSearch ? { search } : {}),
        ...(hasIssueNumber ? { issueNumber } : {}),
        limit,
      });

      return data.issues.nodes.map(mapIssueToTicket);
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}
