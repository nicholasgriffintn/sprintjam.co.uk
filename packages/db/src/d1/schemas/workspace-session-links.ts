import { index, integer, sqliteTable, unique } from "drizzle-orm/sqlite-core";

import { teamSessions } from "./team-sessions";
import { teams } from "./teams";
import { users } from "./users";
import { workspaceProcessLoops } from "./workspace-process-loops";

export const workspaceSessionLinks = sqliteTable(
  "workspace_session_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    processLoopId: integer("process_loop_id")
      .notNull()
      .references(() => workspaceProcessLoops.id),
    sessionId: integer("session_id")
      .notNull()
      .references(() => teamSessions.id),
    linkedById: integer("linked_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    unique("workspace_session_links_session_unique").on(table.sessionId),
    index("workspace_session_links_team_loop_idx").on(
      table.teamId,
      table.processLoopId,
    ),
  ],
);
