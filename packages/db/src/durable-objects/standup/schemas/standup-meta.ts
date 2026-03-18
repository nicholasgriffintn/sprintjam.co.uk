import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const STANDUP_ROW_ID = 1;

export const standupMeta = sqliteTable("standup_meta", {
  id: integer("id")
    .primaryKey()
    .notNull()
    .$default(() => STANDUP_ROW_ID),
  standupKey: text("standup_key").notNull(),
  moderator: text("moderator").notNull(),
  status: text("status").notNull().default("active"),
  passcode: text("passcode"),
  teamId: integer("team_id"),
  presentationTheme: text("presentation_theme").default("default"),
  createdAt: integer("created_at").notNull(),
});

export const standupUsers = sqliteTable("standup_users", {
  userName: text("user_name").primaryKey().notNull(),
  avatar: text("avatar"),
  isConnected: integer("is_connected").notNull().default(0),
  ordinal: integer("ordinal").notNull().default(0),
});

export const standupResponses = sqliteTable("standup_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userName: text("user_name").notNull().unique(),
  isInPerson: integer("is_in_person").notNull().default(0),
  yesterday: text("yesterday").notNull().default(""),
  today: text("today").notNull().default(""),
  hasBlocker: integer("has_blocker").notNull().default(0),
  blockerDescription: text("blocker_description"),
  healthCheck: integer("health_check").notNull().default(3),
  linkedTickets: text("linked_tickets"), // JSON array of ticket refs
  kudos: text("kudos"),
  icebreakerAnswer: text("icebreaker_answer"),
  submittedAt: integer("submitted_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const standupReactions = sqliteTable("standup_reactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  responseUserName: text("response_user_name").notNull(),
  reactingUserName: text("reacting_user_name").notNull(),
  emoji: text("emoji").notNull(),
});

export const standupSessionTokens = sqliteTable("standup_session_tokens", {
  userName: text("user_name").primaryKey().notNull(),
  token: text("token").notNull(),
  createdAt: integer("created_at").notNull(),
});
