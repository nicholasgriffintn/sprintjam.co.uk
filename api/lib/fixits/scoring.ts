export interface PointBreakdown {
  basePoints: number;
  labelBonus: number;
  severityBonus: number;
  storyPoints: number;
  total: number;
  severity: string | null;
}

type GithubEventPayload = Record<string, unknown>;

const BUG_LABEL_REGEX = /bug/i;
const DOCS_LABEL_REGEX = /docs|documentation/i;
const ENHANCEMENT_LABEL_REGEX = /enhancement|feature/i;
const TECH_DEBT_REGEX = /tech[-\s]?debt|technical debt/i;
const PERFORMANCE_REGEX = /performance|optimization/i;
const SECURITY_REGEX = /security|vulnerability/i;
const PRIORITY_REGEX = /priority[:\s-]?(critical|high|medium|low|p[0-3])/i;

const SEVERITY_REGEX = /severity[:\s-]?([a-z0-5]+)/i;
const STORY_POINTS_REGEX = /(?:sp|story[\s-]*points?)[:\s-]?(\d+)/i;

export function calculateBasePoints(
  eventType: string,
  action: string | undefined,
  payload: GithubEventPayload,
): number {
  switch (eventType) {
    case "pull_request":
      if (
        action === "closed" &&
        (payload as any)?.pull_request?.merged
      ) {
        return 5;
      }
      if (action === "opened") {
        return 2;
      }
      return 3;
    case "issues":
      if (action === "closed") {
        return 2;
      }
      return 1;
    case "workflow_run":
      if ((payload as any)?.workflow_run?.conclusion === "success") {
        return 2;
      }
      return 1;
    case "push":
      return 1;
    default:
      return 1;
  }
}

export function calculateLabelBonus(labels: string[]): number {
  let bonus = 0;

  for (const rawLabel of labels) {
    const label = rawLabel.toLowerCase();

    if (BUG_LABEL_REGEX.test(label)) bonus += 2;
    if (DOCS_LABEL_REGEX.test(label)) bonus += 1;
    if (ENHANCEMENT_LABEL_REGEX.test(label)) bonus += 1;

    if (PRIORITY_REGEX.test(label)) {
      if (/critical|p0/.test(label)) bonus += 6;
      else if (/high|p1/.test(label)) bonus += 4;
      else if (/medium|p2/.test(label)) bonus += 2;
      else if (/low|p3/.test(label)) bonus += 1;
    }

    if (TECH_DEBT_REGEX.test(label)) bonus += 2;
    if (PERFORMANCE_REGEX.test(label)) bonus += 3;
    if (SECURITY_REGEX.test(label)) bonus += 5;
  }

  return bonus;
}

export function parseSeverity(labels: string[]): {
  severity: string | null;
  bonus: number;
} {
  for (const label of labels) {
    const match = label.match(SEVERITY_REGEX);
    if (!match) continue;

    const normalized = match[1]?.toLowerCase();
    if (!normalized) continue;

    if (normalized === "critical" || normalized === "p0") {
      return { severity: "critical", bonus: 8 };
    }
    if (normalized === "high" || normalized === "p1") {
      return { severity: "high", bonus: 5 };
    }
    if (normalized === "medium" || normalized === "p2") {
      return { severity: "medium", bonus: 3 };
    }
    if (normalized === "low" || normalized === "p3") {
      return { severity: "low", bonus: 1 };
    }
  }

  return { severity: null, bonus: 0 };
}

export function extractStoryPoints(labels: string[]): number {
  for (const label of labels) {
    const match = label.match(STORY_POINTS_REGEX);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 0;
}

export function calculatePointsSummary(params: {
  eventType: string;
  action?: string;
  labels: string[];
  payload: GithubEventPayload;
}): PointBreakdown {
  const basePoints = calculateBasePoints(
    params.eventType,
    params.action,
    params.payload,
  );
  const labelBonus = calculateLabelBonus(params.labels);
  const { severity, bonus: severityBonus } = parseSeverity(params.labels);
  const storyPoints = extractStoryPoints(params.labels);
  const total = basePoints + labelBonus + severityBonus + storyPoints;

  return {
    basePoints,
    labelBonus,
    severityBonus,
    storyPoints,
    total,
    severity,
  };
}
