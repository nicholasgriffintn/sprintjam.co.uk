import type { TicketMetadata } from "../../src/types";
import type { JiraFieldDefinition, JiraOAuthCredentials } from "../types";

function parseJiraDescription(description: any): string {
  if (!description) return "";

  try {
    if (typeof description === "string") return description;
    if (description.content && Array.isArray(description.content)) {
      return description.content
        .map((block: any) => {
          if (block.content && Array.isArray(block.content)) {
            return block.content
              .map((textNode: any) => textNode.text || "")
              .join("");
          }
          return block.text || "";
        })
        .join("\n");
    }
  } catch (e) {
    console.error("Error parsing Jira description:", e);
  }

  return "";
}

function escapeJqlValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getOAuthHeaders(accessToken: string): Headers {
  return new Headers({
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
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
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Token refresh failed:", errorData);
    throw new Error(
      "Failed to refresh OAuth token. User needs to re-authenticate.",
    );
  }

  const data = await response.json<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

async function executeWithTokenRefresh<T>(
  credentials: JiraOAuthCredentials,
  operation: (accessToken: string) => Promise<T>,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<T> {
  const isExpiringSoon = credentials.expiresAt - Date.now() < 5 * 60 * 1000;

  if (isExpiringSoon && credentials.refreshToken) {
    try {
      const refreshed = await refreshOAuthToken(
        credentials.refreshToken,
        clientId,
        clientSecret,
      );

      const newExpiresAt = Date.now() + refreshed.expiresIn * 1000;

      await onTokenRefresh(
        refreshed.accessToken,
        refreshed.refreshToken,
        newExpiresAt,
      );

      return await operation(refreshed.accessToken);
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Try with existing token anyway
    }
  }

  try {
    return await operation(credentials.accessToken);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("401") &&
      credentials.refreshToken
    ) {
      try {
        const refreshed = await refreshOAuthToken(
          credentials.refreshToken,
          clientId,
          clientSecret,
        );

        const newExpiresAt = Date.now() + refreshed.expiresIn * 1000;

        await onTokenRefresh(
          refreshed.accessToken,
          refreshed.refreshToken,
          newExpiresAt,
        );

        return await operation(refreshed.accessToken);
      } catch (refreshError) {
        console.error("Token refresh retry failed:", refreshError);
        throw new Error(
          "OAuth token expired. Please reconnect your Jira account.",
        );
      }
    }
    throw error;
  }
}

export async function fetchJiraTicket(
  credentials: JiraOAuthCredentials,
  ticketId: string,
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
      const headers = getOAuthHeaders(accessToken);
      const response = await fetch(
        `https://api.atlassian.com/ex/jira/${credentials.jiraCloudId}/rest/api/3/issue/${ticketId}`,
        {
          method: "GET",
          headers,
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401: Unauthorized");
        }
        const errorData = (await response.json()) as {
          errorMessages: string[];
        };
        throw new Error(
          errorData.errorMessages?.[0] ||
            `Failed to fetch Jira ticket: ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        id: string;
        key: string;
        fields: {
          summary: string;
          description: {
            content: {
              text: string;
            }[];
          }[];
          status: {
            name: string;
          };
          assignee: {
            displayName: string;
          };
          [key: string]: any;
        };
      };

      const storyPoints = credentials.storyPointsField
        ? data.fields[credentials.storyPointsField]
        : null;

      const ticket: TicketMetadata = {
        id: data.id,
        key: data.key,
        summary: data.fields.summary,
        description: parseJiraDescription(data.fields.description) || "",
        status: data.fields.status?.name || "Unknown",
        assignee: data.fields.assignee?.displayName || null,
        storyPoints,
        url: `https://${credentials.jiraDomain}/browse/${data.key}`,
      };

      return ticket;
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}

export async function fetchJiraFields(
  credentials: JiraOAuthCredentials,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<JiraFieldDefinition[]> {
  if (!credentials.jiraCloudId) {
    throw new Error("Jira cloud ID missing from credentials.");
  }

  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const headers = getOAuthHeaders(accessToken);
      const response = await fetch(
        `https://api.atlassian.com/ex/jira/${credentials.jiraCloudId}/rest/api/3/field`,
        {
          method: "GET",
          headers,
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401: Unauthorized");
        }
        throw new Error(`Failed to fetch Jira fields: ${response.status}`);
      }

      return (await response.json()) as JiraFieldDefinition[];
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}

export function findDefaultStoryPointsField(
  fields: JiraFieldDefinition[],
): string | null {
  const normalize = (value: string) => value.trim().toLowerCase();
  const preferredNames = [
    "story points",
    "story point estimate",
    "story points estimate",
  ];

  for (const name of preferredNames) {
    const match = fields.find((field) => normalize(field.name) === name);
    if (match) return match.id;
  }

  const partialMatch = fields.find((field) =>
    normalize(field.name).includes("story point"),
  );
  if (partialMatch) return partialMatch.id;

  const numericField = fields.find((field) => field.schema?.type === "number");
  return numericField?.id ?? null;
}

export function findDefaultSprintField(
  fields: JiraFieldDefinition[],
): string | null {
  const normalize = (value: string) => value.trim().toLowerCase();
  const sprintMatch = fields.find(
    (field) =>
      normalize(field.name) === "sprint" ||
      normalize(field.name).includes("sprint"),
  );
  return sprintMatch?.id ?? null;
}

export async function updateJiraStoryPoints(
  credentials: JiraOAuthCredentials,
  ticketId: string,
  storyPoints: number,
  currentTicket: TicketMetadata | undefined,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>,
  clientId: string,
  clientSecret: string,
): Promise<TicketMetadata> {
  if (!credentials.storyPointsField) {
    throw new Error(
      "Story points field not configured. Please reconnect your Jira account and configure the story points field.",
    );
  }

  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const headers = getOAuthHeaders(accessToken);

      const response = await fetch(
        `https://api.atlassian.com/ex/jira/${credentials.jiraCloudId}/rest/api/3/issue/${ticketId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            fields: {
              [credentials.storyPointsField!]: storyPoints,
            },
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401: Unauthorized");
        }
        const errorData = (await response.json()) as {
          errorMessages: string[];
        };
        throw new Error(
          errorData.errorMessages?.[0] ||
            `Failed to update Jira story points: ${response.status}`,
        );
      }

      if (currentTicket) {
        return {
          ...currentTicket,
          storyPoints,
        };
      }

      return await fetchJiraTicket(
        credentials,
        ticketId,
        onTokenRefresh,
        clientId,
        clientSecret,
      );
    },
    onTokenRefresh,
    clientId,
    clientSecret,
  );
}

export async function fetchJiraBoards(
  credentials: JiraOAuthCredentials,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => Promise<void>,
  clientId: string,
  clientSecret: string
): Promise<
  Array<{
    id: string;
    name: string;
    type?: string;
  }>
> {
  if (!credentials.jiraCloudId) {
    throw new Error('Jira cloud ID missing from credentials.');
  }

  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const headers = getOAuthHeaders(accessToken);
      const boards: Array<{ id: string; name: string; type?: string }> = [];
      let startAt = 0;
      let isLast = false;

      while (!isLast) {
        const response = await fetch(
          `https://api.atlassian.com/ex/jira/${credentials.jiraCloudId}/rest/agile/1.0/board?startAt=${startAt}&maxResults=50`,
          {
            method: 'GET',
            headers,
          }
        );

        if (!response.ok) {
          await response.text().catch(() => '');
          if (response.status === 401) {
            throw new Error('Unauthorized. Please reconnect Jira.');
          }
          throw new Error('Failed to fetch Jira boards.');
        }

        const data = await response.json<{
          values?: Array<{ id: number; name: string; type?: string }>;
          isLast?: boolean;
          startAt: number;
          maxResults: number;
          total?: number;
        }>();

        const values = data.values ?? [];
        boards.push(
          ...values.map((board) => ({
            id: String(board.id),
            name: board.name,
            type: board.type,
          }))
        );

        const nextStart = data.startAt + data.maxResults;
        const total = data.total ?? nextStart;
        isLast = data.isLast ?? nextStart >= total;
        startAt = nextStart;
      }

      return boards;
    },
    onTokenRefresh,
    clientId,
    clientSecret
  );
}

export async function fetchJiraSprints(
  credentials: JiraOAuthCredentials,
  boardId: string,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => Promise<void>,
  clientId: string,
  clientSecret: string
): Promise<
  Array<{
    id: string;
    name: string;
    state?: string;
    startDate?: string | null;
    endDate?: string | null;
  }>
> {
  if (!credentials.jiraCloudId) {
    throw new Error('Jira cloud ID missing from credentials.');
  }

  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const headers = getOAuthHeaders(accessToken);
      const sprints: Array<{
        id: string;
        name: string;
        state?: string;
        startDate?: string | null;
        endDate?: string | null;
      }> = [];
      let startAt = 0;
      let isLast = false;

      while (!isLast) {
        const response = await fetch(
          `https://api.atlassian.com/ex/jira/${
            credentials.jiraCloudId
          }/rest/agile/1.0/board/${encodeURIComponent(
            boardId
          )}/sprint?startAt=${startAt}&maxResults=50&state=active,future,closed`,
          {
            method: 'GET',
            headers,
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized. Please reconnect Jira.');
          }
          throw new Error('Failed to fetch Jira sprints.');
        }

        const data = await response.json<{
          values?: Array<{
            id: number;
            name: string;
            state?: string;
            startDate?: string;
            endDate?: string;
          }>;
          isLast?: boolean;
          startAt: number;
          maxResults: number;
          total?: number;
        }>();

        const values = data.values ?? [];
        sprints.push(
          ...values.map((sprint) => ({
            id: String(sprint.id),
            name: sprint.name,
            state: sprint.state,
            startDate: sprint.startDate ?? null,
            endDate: sprint.endDate ?? null,
          }))
        );

        const nextStart = data.startAt + data.maxResults;
        const total = data.total ?? nextStart;
        isLast = data.isLast ?? nextStart >= total;
        startAt = nextStart;
      }

      return sprints;
    },
    onTokenRefresh,
    clientId,
    clientSecret
  );
}

export async function fetchJiraBoardIssues(
  credentials: JiraOAuthCredentials,
  boardId: string,
  options: {
    sprintId?: string | null;
    limit?: number | null;
    search?: string | null;
  },
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => Promise<void>,
  clientId: string,
  clientSecret: string
): Promise<TicketMetadata[]> {
  if (!credentials.jiraCloudId) {
    throw new Error('Jira cloud ID missing from credentials.');
  }

  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const headers = getOAuthHeaders(accessToken);
      const tickets: TicketMetadata[] = [];
      const sprintId = options.sprintId ?? null;
      const search = options.search?.trim() ?? '';
      const limit = options.limit ?? null;
      let startAt = 0;
      let remaining = limit ?? Infinity;

      while (remaining > 0) {
        const pageSize = Math.min(50, remaining);
        const clauses: string[] = [];
        if (sprintId) {
          clauses.push(`sprint = ${sprintId}`);
        }
        if (search) {
          const trimmed = search.trim();
          const isKeySearch = /^[A-Z][A-Z0-9]+-\d+$/i.test(trimmed);
          if (isKeySearch) {
            clauses.push(`key = ${trimmed}`);
          } else {
            const escaped = escapeJqlValue(trimmed);
            clauses.push(`text ~ "${escaped}"`);
          }
        }
        const jql = clauses.length > 0 ? clauses.join(' AND ') : undefined;
        const params = new URLSearchParams({
          startAt: String(startAt),
          maxResults: String(pageSize),
        });
        if (jql) {
          params.set('jql', jql);
        }
        const fields = ['summary', 'description', 'status', 'assignee'];
        if (credentials.storyPointsField) {
          fields.push(credentials.storyPointsField);
        }
        params.set('fields', fields.join(','));

        const response = await fetch(
          `https://api.atlassian.com/ex/jira/${
            credentials.jiraCloudId
          }/rest/agile/1.0/board/${encodeURIComponent(
            boardId
          )}/issue?${params.toString()}`,
          {
            method: 'GET',
            headers,
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized. Please reconnect Jira.');
          }
          if (response.status === 403) {
            throw new Error('Jira access denied. Check board permissions.');
          }
          if (response.status === 400) {
            throw new Error('Jira search failed. Try a different query.');
          }
          throw new Error('Failed to fetch Jira issues.');
        }

        const data = await response.json<{
          issues?: Array<{
            id: string;
            key: string;
            fields: {
              summary?: string;
              description?: unknown;
              status?: { name?: string };
              assignee?: { displayName?: string };
              [key: string]: any;
            };
          }>;
          startAt: number;
          maxResults: number;
          total?: number;
        }>();

        const issues = data.issues ?? [];
        tickets.push(
          ...issues.map((issue) => ({
            id: issue.id,
            key: issue.key,
            summary: issue.fields?.summary ?? '',
            description: parseJiraDescription(issue.fields?.description) || '',
            status: issue.fields?.status?.name || 'Unknown',
            assignee: issue.fields?.assignee?.displayName || null,
            storyPoints: credentials.storyPointsField
              ? issue.fields?.[credentials.storyPointsField]
              : null,
            url: `https://${credentials.jiraDomain}/browse/${issue.key}`,
          }))
        );

        startAt = data.startAt + data.maxResults;
        remaining -= pageSize;
        const total = data.total ?? startAt;
        if (startAt >= total) {
          break;
        }
        if (limit !== null && remaining <= 0) {
          break;
        }
      }

      return tickets;
    },
    onTokenRefresh,
    clientId,
    clientSecret
  );
}
