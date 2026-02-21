import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const authChallenges = sqliteTable(
  "auth_challenges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    type: text("type").notNull(),
    method: text("method"),
    metadata: text("metadata"),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
    usedAt: integer("used_at"),
  },
  (table) => [
    index("auth_challenges_user_expires_idx").on(table.userId, table.expiresAt),
  ],
);
