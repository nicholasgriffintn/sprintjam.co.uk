import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const standupSessionStats = sqliteTable("standup_session_stats", {
  roomKey: text("room_key").primaryKey(),
  totalParticipants: integer("total_participants").notNull(),
  responsesSubmitted: integer("responses_submitted").notNull(),
  healthScoreTotal: integer("health_score_total").notNull(),
  healthResponseCount: integer("health_response_count").notNull(),
  blockerCount: integer("blocker_count").notNull(),
  unresolvedBlockerCount: integer("unresolved_blocker_count").notNull(),
  linkedTicketCount: integer("linked_ticket_count").notNull(),
  kudosCount: integer("kudos_count").notNull(),
  lastUpdatedAt: integer("last_updated_at").notNull(),
});
