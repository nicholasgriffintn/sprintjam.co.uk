import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { teams } from "./teams";
import { users } from "./users";

export const teamCollaborationInstallations = sqliteTable(
  "team_collaboration_installations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: ["teams", "slack"] }).notNull(),
    contextKey: text("context_key").notNull(),
    tenantId: text("tenant_id").notNull(),
    externalTeamId: text("external_team_id"),
    externalChannelId: text("external_channel_id"),
    externalChatId: text("external_chat_id"),
    externalMeetingId: text("external_meeting_id"),
    externalUserId: text("external_user_id"),
    displayName: text("display_name"),
    installedById: integer("installed_by_id")
      .notNull()
      .references(() => users.id),
    metadata: text("metadata"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    platformContextUnique: unique().on(table.platform, table.contextKey),
  }),
);
