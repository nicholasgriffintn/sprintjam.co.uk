import type { TicketQueueItem } from "@/types";
import { formatDate } from "@/utils/date";
import { csvEscape } from "@/utils/csv";

export const buildCsv = (tickets: TicketQueueItem[]) => {
  const rows: (string | number | null | undefined)[][] = [
    ["Ticket", "User", "Vote", "Structured Points", "Outcome", "Completed At"],
  ];

  tickets.forEach((ticket) => {
    const votes = ticket.votes && ticket.votes.length > 0 ? ticket.votes : [];

    if (votes.length === 0) {
      rows.push([
        ticket.ticketId,
        "",
        "",
        "",
        ticket.outcome ?? "",
        ticket.completedAt ? formatDate(ticket.completedAt) : "",
      ]);
      return;
    }

    votes.forEach((vote) => {
      rows.push([
        ticket.ticketId,
        vote.userName,
        vote.vote,
        vote.structuredVotePayload?.calculatedStoryPoints,
        ticket.outcome ?? "",
        ticket.completedAt ? formatDate(ticket.completedAt) : "",
      ]);
    });
  });

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
};
