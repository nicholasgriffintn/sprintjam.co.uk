import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const retroSessionStats = sqliteTable("retro_session_stats", {
  roomKey: text("room_key").primaryKey(),
  templateId: text("template_id").notNull(),
  templateName: text("template_name").notNull(),
  totalParticipants: integer("total_participants").notNull(),
  cardCount: integer("card_count").notNull(),
  voteCount: integer("vote_count").notNull(),
  actionCount: integer("action_count").notNull(),
  completedActionCount: integer("completed_action_count").notNull(),
  durationMs: integer("duration_ms"),
  lastUpdatedAt: integer("last_updated_at").notNull(),
});
