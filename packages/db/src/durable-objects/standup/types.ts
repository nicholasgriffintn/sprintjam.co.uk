import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

import type * as schema from "./schemas";

import {
  standupMeta,
  standupResponses,
  standupSessionTokens,
  standupUsers,
} from "./schemas/standup-meta";

export type StandupDB = DrizzleSqliteDODatabase<typeof schema>;

export type StandupMetaItem = typeof standupMeta.$inferSelect;
export type InsertStandupMetaItem = typeof standupMeta.$inferInsert;

export type StandupUsersItem = typeof standupUsers.$inferSelect;
export type InsertStandupUsersItem = typeof standupUsers.$inferInsert;

export type StandupResponsesItem = typeof standupResponses.$inferSelect;
export type InsertStandupResponsesItem = typeof standupResponses.$inferInsert;

export type StandupSessionTokensItem = typeof standupSessionTokens.$inferSelect;
export type InsertStandupSessionTokensItem =
  typeof standupSessionTokens.$inferInsert;
