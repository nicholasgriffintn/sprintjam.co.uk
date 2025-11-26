import type { D1Database } from "@cloudflare/workers-types";

export interface FixitRunRecord {
  fixitId: string;
  name: string;
  description?: string | null;
  startDate?: number | null;
  endDate?: number | null;
  isActive: boolean;
  config?: Record<string, unknown> | null;
  roomId?: string | null;
  moderator?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface UpsertFixitRunInput {
  fixitId: string;
  name: string;
  description?: string | null;
  startDate?: number | null;
  endDate?: number | null;
  isActive?: boolean;
  config?: Record<string, unknown> | null;
  roomId?: string | null;
  moderator?: string | null;
}

export class FixitRunsRepository {
  constructor(private db: D1Database) {}

  private mapRow(row: Record<string, any>): FixitRunRecord {
    return {
      fixitId: row.fixit_id,
      name: row.name,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active === 1,
      config: row.config ? JSON.parse(row.config) : null,
      roomId: row.room_id,
      moderator: row.moderator,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listRuns(options?: {
    includeInactive?: boolean;
    limit?: number;
  }): Promise<FixitRunRecord[]> {
    const includeInactive = options?.includeInactive ?? false;
    const limit = options?.limit ?? 50;
    const query = includeInactive
      ? `SELECT * FROM fixit_runs ORDER BY start_date DESC LIMIT ?`
      : `SELECT * FROM fixit_runs WHERE is_active = 1 ORDER BY start_date DESC LIMIT ?`;

    const result = await this.db.prepare(query).bind(limit).all();
    const rows = (result.results ?? []) as Record<string, any>[];
    return rows.map((row) => this.mapRow(row));
  }

  async getRun(fixitId: string): Promise<FixitRunRecord | null> {
    const result = await this.db
      .prepare(`SELECT * FROM fixit_runs WHERE fixit_id = ? LIMIT 1`)
      .bind(fixitId)
      .first<Record<string, any>>();

    return result ? this.mapRow(result) : null;
  }

  async createRun(input: UpsertFixitRunInput): Promise<FixitRunRecord> {
    const now = Date.now();
    await this.db
      .prepare(
        `
        INSERT INTO fixit_runs (
          fixit_id,
          name,
          description,
          start_date,
          end_date,
          is_active,
          config,
          room_id,
          moderator,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(
        input.fixitId,
        input.name,
        input.description ?? null,
        input.startDate ?? null,
        input.endDate ?? null,
        input.isActive === false ? 0 : 1,
        input.config ? JSON.stringify(input.config) : null,
        input.roomId ?? null,
        input.moderator ?? null,
        now,
        now,
      )
      .run();

    return (await this.getRun(input.fixitId))!;
  }

  async updateRun(
    fixitId: string,
    updates: Partial<UpsertFixitRunInput>,
  ): Promise<FixitRunRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.startDate !== undefined) {
      fields.push("start_date = ?");
      values.push(updates.startDate ?? null);
    }
    if (updates.endDate !== undefined) {
      fields.push("end_date = ?");
      values.push(updates.endDate ?? null);
    }
    if (updates.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.config !== undefined) {
      fields.push("config = ?");
      values.push(
        updates.config ? JSON.stringify(updates.config) : null,
      );
    }
    if (updates.roomId !== undefined) {
      fields.push("room_id = ?");
      values.push(updates.roomId ?? null);
    }
    if (updates.moderator !== undefined) {
      fields.push("moderator = ?");
      values.push(updates.moderator ?? null);
    }

    if (!fields.length) {
      return this.getRun(fixitId);
    }

    fields.push("updated_at = ?");
    values.push(Date.now());

    values.push(fixitId);

    await this.db
      .prepare(
        `
        UPDATE fixit_runs
        SET ${fields.join(", ")}
        WHERE fixit_id = ?
      `,
      )
      .bind(...values)
      .run();

    return this.getRun(fixitId);
  }

  async deleteRun(fixitId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM fixit_runs WHERE fixit_id = ?`)
      .bind(fixitId)
      .run();
  }
}
