import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { teams } from "./teams";
import { users } from "./users";

export const teamMemberships = sqliteTable(
  "team_memberships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
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
    teamUserUnique: uniqueIndex("team_memberships_team_user_unique").on(
      table.teamId,
      table.userId,
    ),
    teamStatusIdx: index("team_memberships_team_status_idx").on(
      table.teamId,
      table.status,
    ),
    userStatusIdx: index("team_memberships_user_status_idx").on(
      table.userId,
      table.status,
    ),
  }),
);
