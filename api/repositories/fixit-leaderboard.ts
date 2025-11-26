import type { D1Database } from "@cloudflare/workers-types";

export interface LeaderboardEntry {
  fixit_id: string;
  user: string;
  points: number;
  bugs_closed: number;
  prs_merged: number;
  issues_closed: number;
  last_event_timestamp: number | null;
  last_severity: string | null;
  last_labels: string | null;
  last_story_points: number | null;
  delta_points: number | null;
  rank: number | null;
  updated_at: number;
}

export interface LeaderboardDelta {
  fixitId: string;
  user: string;
  points: number;
  bugsClosed?: number;
  prsMerged?: number;
  issuesClosed?: number;
  timestamp: number;
  severity: string | null;
  labels: string[];
  storyPoints: number;
}

export class FixitLeaderboardRepository {
  constructor(private db: D1Database) {}

  async applyDelta(delta: LeaderboardDelta): Promise<void> {
    await this.db
      .prepare(
        `
        INSERT INTO leaderboard (
          fixit_id,
          user,
          points,
          bugs_closed,
          prs_merged,
          issues_closed,
          last_event_timestamp,
          last_severity,
          last_labels,
          last_story_points,
          delta_points,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(fixit_id, user) DO UPDATE SET
          points = leaderboard.points + excluded.points,
          bugs_closed = leaderboard.bugs_closed + excluded.bugs_closed,
          prs_merged = leaderboard.prs_merged + excluded.prs_merged,
          issues_closed = leaderboard.issues_closed + excluded.issues_closed,
          last_event_timestamp = excluded.last_event_timestamp,
          last_severity = excluded.last_severity,
          last_labels = excluded.last_labels,
          last_story_points = excluded.last_story_points,
          delta_points = excluded.delta_points,
          updated_at = excluded.updated_at
      `,
      )
      .bind(
        delta.fixitId,
        delta.user,
        delta.points,
        delta.bugsClosed ?? 0,
        delta.prsMerged ?? 0,
        delta.issuesClosed ?? 0,
        delta.timestamp,
        delta.severity,
        JSON.stringify(delta.labels),
        delta.storyPoints || null,
        delta.points,
        Date.now(),
      )
      .run();
  }

  async getLeaderboard(
    fixitId: string,
    limit = 100,
  ): Promise<LeaderboardEntry[]> {
    const result = await this.db
      .prepare(
        `
        SELECT *
        FROM leaderboard
        WHERE fixit_id = ?
        ORDER BY points DESC, updated_at ASC
        LIMIT ?
      `,
      )
      .bind(fixitId, limit)
      .all();

    return (result.results ?? []) as LeaderboardEntry[];
  }
}
