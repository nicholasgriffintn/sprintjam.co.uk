import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { teams } from "./teams";
import { users } from "./users";

export const teamSessions = sqliteTable("team_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  roomKey: text("room_key").notNull(),
  name: text("name").notNull(),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
  metadata: text("metadata"),
});
