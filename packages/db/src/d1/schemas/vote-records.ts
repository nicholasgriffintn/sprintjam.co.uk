import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';

import { roundVotes } from './round-votes';

export const voteRecords = sqliteTable(
  'vote_records',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roundId: text('round_id')
      .notNull()
      .references(() => roundVotes.roundId, { onDelete: 'cascade' }),
    userName: text('user_name').notNull(),
    vote: text('vote').notNull(),
    structuredVotePayload: text('structured_vote_payload'),
    votedAt: integer('voted_at').notNull(),
  },
  (table) => [
    unique('vote_records_round_user').on(table.roundId, table.userName),
    index('idx_vote_records_round').on(table.roundId),
    index('idx_vote_records_user').on(table.userName),
  ]
);
