import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const roomVotes = sqliteTable("room_votes", {
  userName: text("user_name").primaryKey().notNull(),
  vote: text("vote").notNull(),
  structuredVotePayload: text("structured_vote_payload"),
});
