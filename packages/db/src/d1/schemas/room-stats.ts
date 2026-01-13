import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const roomStats = sqliteTable(
  'room_stats',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roomKey: text('room_key').notNull().unique(),
    totalRounds: integer('total_rounds').notNull().default(0),
    totalVotes: integer('total_votes').notNull().default(0),
    lastUpdatedAt: integer('last_updated_at').notNull(),
  },
  (table) => [index('idx_room_stats_key').on(table.roomKey)]
);
