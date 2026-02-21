import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { ticketQueue } from "./ticket-queue";

export const ticketVotes = sqliteTable(
  "ticket_votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    ticketQueueId: integer("ticket_queue_id")
      .notNull()
      .references(() => ticketQueue.id, { onDelete: "cascade" }),
    userName: text("user_name").notNull(),
    vote: text("vote").notNull(),
    structuredVotePayload: text("structured_vote_payload"),
    votedAt: integer("voted_at").notNull(),
  },
  (table) => ({
    ticketQueueIdx: index("idx_ticket_votes_ticket").on(table.ticketQueueId),
    ticketUserUnique: unique().on(table.ticketQueueId, table.userName),
  }),
);
