import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { teams } from "./teams";
import { users } from "./users";

export const workspaceProcessLoops = sqliteTable(
  "workspace_process_loops",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    key: text("key").notNull(),
    name: text("name").notNull(),
    goal: text("goal"),
    status: text("status", {
      enum: ["planned", "active", "completed"],
    })
      .notNull()
      .default("active"),
    startsAt: integer("starts_at"),
    endsAt: integer("ends_at"),
    createdById: integer("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => [
    unique("workspace_process_loops_team_key_unique").on(
      table.teamId,
      table.key,
    ),
    index("workspace_process_loops_team_status_idx").on(
      table.teamId,
      table.status,
    ),
  ],
);
