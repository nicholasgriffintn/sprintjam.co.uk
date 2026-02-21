import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const organisations = sqliteTable("organisations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domain: text("domain").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
