import type { D1Database } from "@cloudflare/workers-types";

export interface FixitEventRecord {
  eventId: string;
  fixitId: string;
  roomId?: string | null;
  user: string;
  points: number;
  basePoints: number;
  labelBonus: number;
  severityBonus: number;
  storyPoints: number;
  eventType: string;
  action?: string;
  labels: string[];
  severity: string | null;
  timestamp: number;
  rawPayload: string;
}

export class FixitEventsRepository {
  constructor(private db: D1Database) {}

  async insertEvent(record: FixitEventRecord): Promise<boolean> {
    const result = await this.db
      .prepare(
        `
        INSERT INTO fixit_events (
          event_id,
          fixit_id,
          room_id,
          user,
          points,
          base_points,
          label_bonus,
          severity_bonus,
          story_points,
          event_type,
          action,
          labels,
          severity,
          timestamp,
          raw_payload,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(event_id) DO NOTHING
      `,
      )
      .bind(
        record.eventId,
        record.fixitId,
        record.roomId ?? null,
        record.user,
        record.points,
        record.basePoints,
        record.labelBonus,
        record.severityBonus,
        record.storyPoints,
        record.eventType,
        record.action ?? null,
        JSON.stringify(record.labels),
        record.severity,
        record.timestamp,
        record.rawPayload,
        Date.now(),
      )
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  async listRecentEvents(
    fixitId: string,
    limit = 50,
  ): Promise<
    Array<{
      user: string;
      points: number;
      event_type: string;
      action?: string | null;
      labels?: string | null;
      severity?: string | null;
      timestamp: number;
    }>
  > {
    const result = await this.db
      .prepare(
        `
        SELECT user, points, event_type, action, labels, severity, timestamp
        FROM fixit_events
        WHERE fixit_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `,
      )
      .bind(fixitId, limit)
      .all();

    return (result.results ?? []) as Array<{
      user: string;
      points: number;
      event_type: string;
      action?: string | null;
      labels?: string | null;
      severity?: string | null;
      timestamp: number;
    }>;
  }
}
