import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessionTokens = sqliteTable("session_tokens", {
  userName: text("user_name").primaryKey().notNull(),
  token: text("token").notNull(),
  createdAt: integer("created_at").notNull(),
});
