import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { organisations } from "./organisations";
import { users } from "./users";

export const mfaResetRequests = sqliteTable(
  "mfa_reset_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "expired"],
    })
      .notNull()
      .default("pending"),
    requestedAt: integer("requested_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    resolvedAt: integer("resolved_at"),
    resolvedById: integer("resolved_by_id").references(() => users.id),
  },
  (table) => [
    index("mfa_reset_requests_org_status_expires_idx").on(
      table.organisationId,
      table.status,
      table.expiresAt,
    ),
    index("mfa_reset_requests_user_status_idx").on(table.userId, table.status),
  ],
);
