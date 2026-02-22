import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

import { teams } from "./teams";

export const teamIntegrations = sqliteTable(
  "team_integrations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["jira", "linear", "github"],
    }).notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenType: text("token_type").notNull(),
    expiresAt: integer("expires_at").notNull(),
    scope: text("scope"),
    authorizedBy: text("authorized_by").notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    teamProviderUnique: unique().on(table.teamId, table.provider),
    teamProviderIdx: index("idx_team_integrations_team_provider").on(
      table.teamId,
      table.provider,
    ),
  }),
);
