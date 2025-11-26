type GithubLabel = { name?: string | null };

export function extractLabels(
  payload: Record<string, any>,
  eventType: string,
): string[] {
  const labelSources: GithubLabel[][] = [];

  if (eventType === "pull_request" && payload.pull_request?.labels) {
    labelSources.push(payload.pull_request.labels as GithubLabel[]);
  }
  if (eventType === "issues" && payload.issue?.labels) {
    labelSources.push(payload.issue.labels as GithubLabel[]);
  }
  if (payload.labels) {
    labelSources.push(payload.labels as GithubLabel[]);
  }
  if (payload.label) {
    labelSources.push([payload.label as GithubLabel]);
  }

  return labelSources
    .flat()
    .map((label) => label?.name?.trim())
    .filter((label): label is string => Boolean(label));
}

export function extractTimestamp(
  payload: Record<string, any>,
  eventType: string,
): number {
  const isoTimestamp =
    payload.workflow_run?.updated_at ||
    payload.workflow_run?.created_at ||
    payload.pull_request?.merged_at ||
    payload.pull_request?.closed_at ||
    payload.pull_request?.updated_at ||
    payload.issue?.closed_at ||
    payload.issue?.updated_at ||
    payload.head_commit?.timestamp ||
    payload.repository?.pushed_at;

  if (isoTimestamp) {
    const parsed = Date.parse(isoTimestamp);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

export function determineUser(payload: Record<string, any>): string | null {
  return (
    payload.sender?.login ||
    payload.pusher?.name ||
    payload.head_commit?.author?.username ||
    payload.head_commit?.author?.name ||
    null
  );
}

export function deriveLeaderboardDelta(params: {
  eventType: string;
  action?: string;
  labels: string[];
  payload: Record<string, any>;
}): { bugsClosed: number; prsMerged: number; issuesClosed: number } {
  const { eventType, action, labels } = params;
  let bugsClosed = 0;
  let prsMerged = 0;
  let issuesClosed = 0;

  const labelHasBug = labels.some((label) => /bug/i.test(label));

  if (
    eventType === "pull_request" &&
    action === "closed" &&
    params.payload?.pull_request?.merged
  ) {
    prsMerged = 1;
    if (labelHasBug) {
      bugsClosed = 1;
    }
  }

  if (eventType === "issues" && action === "closed") {
    issuesClosed = 1;
    if (labelHasBug) {
      bugsClosed = 1;
    }
  }

  return { bugsClosed, prsMerged, issuesClosed };
}
