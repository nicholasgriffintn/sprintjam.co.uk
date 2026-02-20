import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const ROOM_ROW_ID = 1;

export const roomMeta = sqliteTable('room_meta', {
  id: integer('id')
    .primaryKey()
    .notNull()
    .$default(() => ROOM_ROW_ID),
  roomKey: text('room_key').notNull(),
  moderator: text('moderator').notNull(),
  showVotes: integer('show_votes').notNull().default(0),
  roomStatus: text('room_status').notNull().default('active'),
  passcode: text('passcode'),
  judgeScore: text('judge_score'),
  judgeMetadata: text('judge_metadata'),
  settings: text('settings').notNull(),
  currentStrudelCode: text('current_strudel_code'),
  currentStrudelGenerationId: text('current_strudel_generation_id'),
  strudelPhase: text('strudel_phase'),
  strudelIsPlaying: integer('strudel_is_playing').notNull().default(0),
  currentTicketId: integer('current_ticket_id'),
  timerSeconds: integer('timer_seconds').default(0),
  timerLastUpdated: integer('timer_last_updated').default(0),
  timerIsPaused: integer('timer_is_paused').default(0),
  timerTargetDuration: integer('timer_target_duration').default(600),
  timerRoundAnchor: integer('timer_round_anchor').default(0),
  timerAutoReset: integer('timer_auto_reset').default(1),
  gameSession: text('game_session'),
});
