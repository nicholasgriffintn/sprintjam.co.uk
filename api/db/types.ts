import type { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';

import type * as schema from './schemas';

import { oauthCredentials } from './schemas/oauth-credentials';
import { roomMeta } from './schemas/room-meta';
import { roomUsers } from './schemas/room-users';
import { roomVotes } from './schemas/room-votes';
import { sessionTokens } from './schemas/session-tokens';
import { ticketQueue } from './schemas/ticket-queue';
import { ticketVotes } from './schemas/ticket-votes';

export type DB = DrizzleSqliteDODatabase<typeof schema>;

export type OauthCredentialsItem = typeof oauthCredentials.$inferSelect;
export type InsertOauthCredentialsItem = typeof oauthCredentials.$inferInsert;

export type RoomMetaItem = typeof roomMeta.$inferSelect;
export type InsertRoomMetaItem = typeof roomMeta.$inferInsert;

export type RoomUsersItem = typeof roomUsers.$inferSelect;
export type InsertRoomUsersItem = typeof roomUsers.$inferInsert;

export type RoomVotesItem = typeof roomVotes.$inferSelect;
export type InsertRoomVotesItem = typeof roomVotes.$inferInsert;

export type SessionTokensItem = typeof sessionTokens.$inferSelect;
export type InsertSessionTokensItem = typeof sessionTokens.$inferInsert;

export type TicketQueueItem = typeof ticketQueue.$inferSelect;
export type InsertTicketQueueItem = typeof ticketQueue.$inferInsert;
export type TicketCreateInput = Omit<
  InsertTicketQueueItem,
  'id' | 'createdAt'
> & {
  createdAt?: number;
  externalServiceMetadata?: Record<string, unknown> | string | null;
};

export type TicketVotesItem = typeof ticketVotes.$inferSelect;
export type InsertTicketVotesItem = typeof ticketVotes.$inferInsert;
