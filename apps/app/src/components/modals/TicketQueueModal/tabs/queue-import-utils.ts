import type { ExternalTicketSummary, TicketMetadata } from "@/types";
import type { QueueProvider } from "./queue-provider";

const MAX_TICKET_DESCRIPTION_LENGTH = 10000;

export function clampTicketDescription(
  description?: string,
): string | undefined {
  if (!description) {
    return undefined;
  }

  return description.length > MAX_TICKET_DESCRIPTION_LENGTH
    ? description.slice(0, MAX_TICKET_DESCRIPTION_LENGTH)
    : description;
}

export function normalizeExternalTicket(
  ticket: TicketMetadata,
): ExternalTicketSummary {
  const rawKey =
    ticket.key ??
    (ticket as { identifier?: string }).identifier ??
    ticket.id ??
    "";
  const key = String(rawKey);
  const id = String(ticket.id ?? key);
  const title =
    ticket.summary ??
    (ticket as { title?: string }).title ??
    (ticket as { name?: string }).name ??
    key;
  const description =
    ticket.description ?? (ticket as { body?: string }).body ?? undefined;
  const url = ticket.url ?? (ticket as { html_url?: string }).html_url;

  return {
    id,
    key,
    title,
    description,
    status: ticket.status ?? "Unknown",
    assignee: ticket.assignee ?? null,
    storyPoints: ticket.storyPoints ?? null,
    estimate: (ticket as { estimate?: number | null }).estimate ?? null,
    labels: (ticket as { labels?: string[] }).labels ?? [],
    url,
    metadata: ticket,
  };
}

function isPointsLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return normalized === "points" || normalized.startsWith("points:");
}

export function isTicketEstimated(
  ticket: ExternalTicketSummary,
  provider: QueueProvider,
): boolean {
  if (provider === "jira" || provider === "linear") {
    return ticket.storyPoints !== null && ticket.storyPoints !== undefined;
  }
  return ticket.labels?.some((label) => isPointsLabel(label)) ?? false;
}
