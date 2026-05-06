import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { teams } from "./teams";
import { users } from "./users";
import { workspaceActionItems } from "./workspace-action-items";

export const workspaceActionEvents = sqliteTable(
  "workspace_action_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    actionId: integer("action_id")
      .notNull()
      .references(() => workspaceActionItems.id),
    actorUserId: integer("actor_user_id").references(() => users.id),
    eventType: text("event_type", {
      enum: ["created", "updated", "status_changed", "commented"],
    }).notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    note: text("note"),
    metadata: text("metadata"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("workspace_action_events_action_idx").on(table.actionId),
    index("workspace_action_events_team_idx").on(table.teamId),
  ],
);
