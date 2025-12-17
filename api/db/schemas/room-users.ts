import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const roomUsers = sqliteTable(
  'room_users',
  {
    userName: text('user_name').primaryKey().notNull(),
    avatar: text('avatar'),
    isConnected: integer('is_connected').notNull().default(0),
    ordinal: integer('ordinal').notNull(),
  },
  (table) => ({
    connectedIdx: index('idx_users_connected').on(table.isConnected),
  })
);
