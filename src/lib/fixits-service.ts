import { FIXITS_API_BASE_URL } from "@/constants";

export interface FixitLeaderboardEntry {
  user: string;
  points: number;
  bugsClosed?: number;
  prsMerged?: number;
  issuesClosed?: number;
  rank?: number;
  lastEventTimestamp?: number;
}

export interface FixitLeaderboardResponse {
  fixitId: string;
  name?: string;
  entries: FixitLeaderboardEntry[];
  message?: string;
}

export interface FixitRun {
  fixitId: string;
  name: string;
  description?: string | null;
  startDate?: number | null;
  endDate?: number | null;
  isActive: boolean;
  roomId?: string | null;
  moderator?: string | null;
  config?: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

export async function fetchFixitLeaderboard(
  params: { fixitId?: string; limit?: number } = {},
): Promise<FixitLeaderboardResponse> {
  const searchParams = new URLSearchParams();

  if (params.fixitId) {
    searchParams.set("fixitId", params.fixitId);
  }

  if (params.limit) {
    searchParams.set("limit", params.limit.toString());
  }

  const response = await fetch(
    `${FIXITS_API_BASE_URL}/leaderboard${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 501) {
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        hint?: string;
      };
      throw new Error(
        payload?.hint ||
          payload?.message ||
          "Fixits API is not available yet. Please try again later.",
      );
    }

    throw new Error(`Failed to fetch Fixit leaderboard: ${response.status}`);
  }

  return (await response.json()) as FixitLeaderboardResponse;
}

export async function fetchFixitRuns(options?: {
  includeInactive?: boolean;
}): Promise<FixitRun[]> {
  const params = new URLSearchParams();
  if (options?.includeInactive) {
    params.set("all", "true");
  }

  const response = await fetch(
    `${FIXITS_API_BASE_URL}/runs${
      params.toString() ? `?${params.toString()}` : ""
    }`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch fixit runs (${response.status})`);
  }

  const data = (await response.json()) as { runs?: FixitRun[] };
  return data.runs ?? [];
}

export interface FixitEvent {
  user: string;
  points: number;
  event_type: string;
  action?: string | null;
  labels?: string | null;
  severity?: string | null;
  timestamp: number;
}

export async function fetchFixitEvents(params: {
  fixitId: string;
  limit?: number;
}): Promise<FixitEvent[]> {
  const search = new URLSearchParams({
    fixitId: params.fixitId,
  });
  if (params.limit) {
    search.set("limit", String(params.limit));
  }

  const response = await fetch(
    `${FIXITS_API_BASE_URL}/events?${search.toString()}`,
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch fixit events (${response.status})`,
    );
  }

  const data = (await response.json()) as {
    events?: FixitEvent[];
  };
  return data.events ?? [];
}

async function requestWithAdminAuth<T>(
  path: string,
  init: RequestInit & { token: string },
): Promise<T> {
  const response = await fetch(`${FIXITS_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${init.token}`,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export interface FixitRunInput {
  fixitId: string;
  name: string;
  description?: string;
  startDate?: number | null;
  endDate?: number | null;
  isActive?: boolean;
  roomId?: string | null;
  moderator?: string | null;
}

export async function createFixitRun(
  input: FixitRunInput,
  token: string,
): Promise<FixitRun> {
  const data = await requestWithAdminAuth<{ run: FixitRun }>(
    `/runs`,
    {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    },
  );
  return data.run;
}

export async function updateFixitRun(
  fixitId: string,
  updates: Partial<FixitRunInput>,
  token: string,
): Promise<FixitRun> {
  const data = await requestWithAdminAuth<{ run: FixitRun }>(
    `/runs/${encodeURIComponent(fixitId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
      token,
    },
  );
  return data.run;
}

export async function deleteFixitRun(
  fixitId: string,
  token: string,
): Promise<void> {
  await requestWithAdminAuth<{ ok: boolean }>(
    `/runs/${encodeURIComponent(fixitId)}`,
    {
      method: 'DELETE',
      token,
    },
  );
}
