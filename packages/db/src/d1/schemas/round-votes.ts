import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const roundVotes = sqliteTable(
  'round_votes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roomKey: text('room_key').notNull(),
    roundId: text('round_id').notNull().unique(),
    ticketId: text('ticket_id'),
    judgeScore: text('judge_score'),
    judgeMetadata: text('judge_metadata'),
    roundEndedAt: integer('round_ended_at').notNull(),
    type: text('type', { enum: ['reset', 'next_ticket'] }),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Math.floor(Date.now() / 1000)),
  },
  (table) => [
    index('idx_round_votes_room').on(table.roomKey),
    index('idx_round_votes_ended').on(table.roundEndedAt),
  ],
);
