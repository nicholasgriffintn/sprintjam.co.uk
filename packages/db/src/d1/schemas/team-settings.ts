import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { teams } from "./teams";

export const teamSettings = sqliteTable("team_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .unique()
    .references(() => teams.id, { onDelete: "cascade" }),
  settings: text("settings").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
