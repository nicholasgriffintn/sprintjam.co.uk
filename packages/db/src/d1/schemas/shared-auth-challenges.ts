import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const sharedAuthChallenges = sqliteTable(
  "shared_auth_challenges",
  {
    tokenHash: text("token_hash").primaryKey(),
    provider: text("provider").notNull(),
    kind: text("kind").notNull(),
    payload: text("payload").notNull(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    attempts: integer("attempts").notNull().default(0),
  },
  (table) => [
    index("shared_auth_challenges_expires_idx").on(table.expiresAt),
    index("shared_auth_challenges_user_idx").on(table.userId),
  ],
);
