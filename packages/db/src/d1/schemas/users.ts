import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { organisations } from "./organisations";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  emailDomain: text("email_domain").notNull(),
  organisationId: integer("organisation_id")
    .notNull()
    .references(() => organisations.id),
  name: text("name"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  lastLoginAt: integer("last_login_at"),
});
