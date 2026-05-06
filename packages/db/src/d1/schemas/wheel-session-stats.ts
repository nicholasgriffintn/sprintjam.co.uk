import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const wheelSessionStats = sqliteTable("wheel_session_stats", {
  roomKey: text("room_key").primaryKey(),
  mode: text("mode").notNull(),
  totalParticipants: integer("total_participants").notNull(),
  entryCount: integer("entry_count").notNull(),
  enabledEntryCount: integer("enabled_entry_count").notNull(),
  spinCount: integer("spin_count").notNull(),
  uniqueWinnerCount: integer("unique_winner_count").notNull(),
  removedAfterCount: integer("removed_after_count").notNull(),
  repeatWinnerCount: integer("repeat_winner_count").notNull(),
  lastUpdatedAt: integer("last_updated_at").notNull(),
});
