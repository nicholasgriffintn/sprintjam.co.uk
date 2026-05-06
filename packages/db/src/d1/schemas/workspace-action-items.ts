import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { teamSessions } from "./team-sessions";
import { teams } from "./teams";
import { users } from "./users";
import { workspaceProcessLoops } from "./workspace-process-loops";

export const workspaceActionItems = sqliteTable(
  "workspace_action_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    processLoopId: integer("process_loop_id").references(
      () => workspaceProcessLoops.id,
    ),
    source: text("source", {
      enum: ["planning", "standup", "wheel", "manual"],
    }).notNull(),
    sourceSessionId: integer("source_session_id").references(
      () => teamSessions.id,
    ),
    sourceRef: text("source_ref").notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    status: text("status", {
      enum: ["open", "in_progress", "resolved", "dismissed"],
    })
      .notNull()
      .default("open"),
    priority: text("priority", {
      enum: ["low", "normal", "high"],
    })
      .notNull()
      .default("normal"),
    ownerUserId: integer("owner_user_id").references(() => users.id),
    ownerName: text("owner_name"),
    dueAt: integer("due_at"),
    externalProvider: text("external_provider"),
    externalTicketKey: text("external_ticket_key"),
    externalTicketUrl: text("external_ticket_url"),
    createdById: integer("created_by_id")
      .notNull()
      .references(() => users.id),
    resolvedById: integer("resolved_by_id").references(() => users.id),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    resolvedAt: integer("resolved_at"),
    metadata: text("metadata"),
  },
  (table) => [
    unique("workspace_action_items_source_unique").on(
      table.teamId,
      table.source,
      table.sourceSessionId,
      table.sourceRef,
    ),
    index("workspace_action_items_team_status_idx").on(
      table.teamId,
      table.status,
    ),
    index("workspace_action_items_team_loop_idx").on(
      table.teamId,
      table.processLoopId,
    ),
  ],
);
