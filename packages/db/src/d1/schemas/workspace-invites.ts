import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { organisations } from "./organisations";
import { users } from "./users";

export const workspaceInvites = sqliteTable(
  "workspace_invites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id),
    email: text("email").notNull(),
    invitedById: integer("invited_by_id")
      .notNull()
      .references(() => users.id),
    acceptedById: integer("accepted_by_id").references(() => users.id),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    acceptedAt: integer("accepted_at"),
    revokedAt: integer("revoked_at"),
  },
  (table) => ({
    organisationEmailUnique: uniqueIndex(
      "workspace_invites_org_email_unique",
    ).on(table.organisationId, table.email),
    emailPendingIdx: index("workspace_invites_email_pending_idx").on(
      table.email,
      table.acceptedAt,
      table.revokedAt,
    ),
    organisationIdx: index("workspace_invites_org_idx").on(table.organisationId),
  }),
);
