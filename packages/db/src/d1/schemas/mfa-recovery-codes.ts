import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const mfaRecoveryCodes = sqliteTable(
  "mfa_recovery_codes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    codeHash: text("code_hash").notNull().unique(),
    usedAt: integer("used_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("mfa_recovery_codes_user_idx").on(table.userId)],
);
