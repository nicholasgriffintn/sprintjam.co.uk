import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { organisations } from "./organisations";
import { users } from "./users";

export const workspaceMemberships = sqliteTable(
  "workspace_memberships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["member", "admin"] }).notNull(),
    status: text("status", {
      enum: ["pending", "active"],
    }).notNull(),
    approvedById: integer("approved_by_id").references(() => users.id),
    approvedAt: integer("approved_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    organisationUserUnique: uniqueIndex(
      "workspace_memberships_org_user_unique",
    ).on(table.organisationId, table.userId),
    organisationStatusIdx: index("workspace_memberships_org_status_idx").on(
      table.organisationId,
      table.status,
    ),
    userStatusIdx: index("workspace_memberships_user_status_idx").on(
      table.userId,
      table.status,
    ),
  }),
);
