-- Fixits schema based on v2.0 proposal

CREATE TABLE IF NOT EXISTS fixit_events (
  event_id TEXT PRIMARY KEY,
  fixit_id TEXT NOT NULL,
  room_id TEXT,
  user TEXT NOT NULL,
  points INTEGER NOT NULL,
  base_points INTEGER NOT NULL,
  label_bonus INTEGER DEFAULT 0,
  severity_bonus INTEGER DEFAULT 0,
  story_points INTEGER DEFAULT 0,
  event_type TEXT NOT NULL,
  action TEXT,
  labels TEXT,
  severity TEXT,
  timestamp INTEGER NOT NULL,
  raw_payload TEXT,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fixit_events_event_id ON fixit_events(event_id);
CREATE INDEX IF NOT EXISTS idx_fixit_lookup ON fixit_events(fixit_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_fixit ON fixit_events(user, fixit_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_type ON fixit_events(event_type, fixit_id);

CREATE TABLE IF NOT EXISTS leaderboard (
  fixit_id TEXT NOT NULL,
  user TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  bugs_closed INTEGER DEFAULT 0,
  prs_merged INTEGER DEFAULT 0,
  issues_closed INTEGER DEFAULT 0,
  last_event_timestamp INTEGER,
  last_severity TEXT,
  last_labels TEXT,
  last_story_points INTEGER,
  delta_points INTEGER,
  rank INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (fixit_id, user)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(fixit_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(fixit_id, rank ASC);

CREATE TABLE IF NOT EXISTS fixit_runs (
  fixit_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date INTEGER,
  end_date INTEGER,
  is_active INTEGER DEFAULT 1,
  config TEXT,
  room_id TEXT,
  moderator TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_runs ON fixit_runs(is_active, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_room_fixits ON fixit_runs(room_id, is_active);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  fixit_id TEXT NOT NULL,
  snapshot_timestamp INTEGER NOT NULL,
  leaderboard_json TEXT NOT NULL,
  total_points INTEGER,
  total_users INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_fixit ON leaderboard_snapshots(fixit_id, snapshot_timestamp DESC);
