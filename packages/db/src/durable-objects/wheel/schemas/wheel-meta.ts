import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const WHEEL_ROW_ID = 1;

export const wheelMeta = sqliteTable("wheel_meta", {
  id: integer("id")
    .primaryKey()
    .notNull()
    .$default(() => WHEEL_ROW_ID),
  wheelKey: text("wheel_key").notNull(),
  moderator: text("moderator").notNull(),
  wheelStatus: text("wheel_status").notNull().default("active"),
  passcode: text("passcode"),
  settings: text("settings").notNull(),
  spinState: text("spin_state"),
});

export const wheelEntries = sqliteTable("wheel_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryId: text("entry_id").notNull().unique(),
  name: text("name").notNull(),
  enabled: integer("enabled").notNull().default(1),
  ordinal: integer("ordinal").notNull().default(0),
});

export const wheelUsers = sqliteTable("wheel_users", {
  userName: text("user_name").primaryKey().notNull(),
  avatar: text("avatar"),
  isConnected: integer("is_connected").notNull().default(0),
  ordinal: integer("ordinal").notNull().default(0),
});

export const wheelResults = sqliteTable("wheel_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resultId: text("result_id").notNull().unique(),
  winner: text("winner").notNull(),
  timestamp: integer("timestamp").notNull(),
  removedAfter: integer("removed_after").notNull().default(0),
});

export const wheelSessionTokens = sqliteTable("wheel_session_tokens", {
  userName: text("user_name").primaryKey().notNull(),
  token: text("token").notNull(),
  createdAt: integer("created_at").notNull(),
});
