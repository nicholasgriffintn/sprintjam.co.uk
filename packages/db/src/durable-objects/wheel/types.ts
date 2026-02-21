import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

import type * as schema from "./schemas";

import {
  wheelEntries,
  wheelMeta,
  wheelResults,
  wheelSessionTokens,
  wheelUsers,
} from "./schemas/wheel-meta";

export type WheelDB = DrizzleSqliteDODatabase<typeof schema>;

export type WheelMetaItem = typeof wheelMeta.$inferSelect;
export type InsertWheelMetaItem = typeof wheelMeta.$inferInsert;

export type WheelEntriesItem = typeof wheelEntries.$inferSelect;
export type InsertWheelEntriesItem = typeof wheelEntries.$inferInsert;

export type WheelUsersItem = typeof wheelUsers.$inferSelect;
export type InsertWheelUsersItem = typeof wheelUsers.$inferInsert;

export type WheelResultsItem = typeof wheelResults.$inferSelect;
export type InsertWheelResultsItem = typeof wheelResults.$inferInsert;

export type WheelSessionTokensItem = typeof wheelSessionTokens.$inferSelect;
export type InsertWheelSessionTokensItem =
  typeof wheelSessionTokens.$inferInsert;
