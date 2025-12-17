import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const ticketQueue = sqliteTable(
  'ticket_queue',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    ticketId: text('ticket_id').notNull().unique(),
    title: text('title'),
    description: text('description'),
    status: text('status', {
      enum: ['pending', 'in_progress', 'blocked', 'completed'],
    })
      .notNull()
      .default('pending'),
    outcome: text('outcome'),
    createdAt: integer('created_at').notNull(),
    completedAt: integer('completed_at'),
    ordinal: integer('ordinal').notNull(),
    externalService: text('external_service', {
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
    }).default('none'),
    externalServiceId: text('external_service_id'),
    externalServiceMetadata: text('external_service_metadata'),
  },
  (table) => ({
    statusOrdinalIdx: index('idx_tickets_status_ordinal').on(
      table.status,
      table.ordinal
    ),
    externalIdx: index('idx_tickets_external').on(
      table.externalService,
      table.externalServiceId
    ),
  })
);
