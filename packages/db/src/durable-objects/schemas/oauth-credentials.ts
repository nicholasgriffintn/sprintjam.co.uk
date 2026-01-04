import {
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';

export const oauthCredentials = sqliteTable(
  'oauth_credentials',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    roomKey: text('room_key').notNull(),
    provider: text('provider', {
      enum: [
        'jira',
        'linear',
        'github',
        'clickup',
        'asana',
        'youtrack',
        'zoho',
        'trello',
        'monday',
        'none',
      ],
    }).notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenType: text('token_type').notNull(),
    expiresAt: integer('expires_at').notNull(),
    scope: text('scope'),
    authorizedBy: text('authorized_by').notNull(),
    metadata: text('metadata'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    roomProviderUnique: unique().on(table.roomKey, table.provider),
    roomProviderIdx: index('idx_oauth_room_provider').on(
      table.roomKey,
      table.provider
    ),
  })
);
