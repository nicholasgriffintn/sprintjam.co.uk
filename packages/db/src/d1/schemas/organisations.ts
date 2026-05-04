import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const organisations = sqliteTable("organisations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domain: text("domain").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  ownerId: integer("owner_id"),
  requireMemberApproval: integer("require_member_approval", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
