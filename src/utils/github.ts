import type { TicketQueueItem } from "@/types";

type GithubMetadata = {
  key?: string;
  number?: number;
  url?: string;
  html_url?: string;
  summary?: string;
  title?: string;
  description?: string;
  body?: string;
};

export const getGithubMetadata = (ticket: TicketQueueItem) => {
  if (ticket.externalService !== "github") {
    return null;
  }

  const metadata = ticket.externalServiceMetadata as GithubMetadata | undefined;
  if (!metadata) {
    return null;
  }

  return {
    key:
      metadata.key ??
      (typeof metadata.number === "number" ? `#${metadata.number}` : undefined),
    url: metadata.url ?? metadata.html_url,
    summary: metadata.summary ?? metadata.title,
    description: metadata.description ?? metadata.body,
  };
};
