import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const allowedDomains = sqliteTable("allowed_domains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domain: text("domain").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
