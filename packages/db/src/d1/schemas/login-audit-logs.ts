import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const loginAuditLogs = sqliteTable(
  "login_audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id),
    email: text("email"),
    event: text("event").notNull(),
    status: text("status").notNull(),
    reason: text("reason"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("login_audit_logs_user_idx").on(table.userId),
    index("login_audit_logs_email_idx").on(table.email),
    index("login_audit_logs_created_idx").on(table.createdAt),
  ],
);
