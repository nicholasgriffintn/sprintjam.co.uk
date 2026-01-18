import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const workspaceSessions = sqliteTable(
  "workspace_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
    lastUsedAt: integer("last_used_at").notNull(),
  },
  (table) => [
    index("workspace_sessions_user_expires_idx").on(
      table.userId,
      table.expiresAt,
    ),
  ],
);
