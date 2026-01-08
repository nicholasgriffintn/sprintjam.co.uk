import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const magicLinks = sqliteTable("magic_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
