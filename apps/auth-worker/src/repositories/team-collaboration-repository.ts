import { drizzle } from "drizzle-orm/d1";
import { and, eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { teamCollaborationInstallations } from "@sprintjam/db";
import * as schema from "@sprintjam/db/d1/schemas";
import type {
  CollaborationPlatform,
  SaveTeamsCollaborationInstallationInput,
  TeamCollaborationInstallation,
} from "@sprintjam/types";
import { safeJsonParse } from "@sprintjam/utils";

import { buildTeamsContextKey } from "../lib/collaboration";

export class TeamCollaborationRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema });
  }

  async listForTeam(teamId: number): Promise<TeamCollaborationInstallation[]> {
    const rows = await this.db
      .select()
      .from(teamCollaborationInstallations)
      .where(eq(teamCollaborationInstallations.teamId, teamId))
      .orderBy(teamCollaborationInstallations.platform);

    return rows.map((row) => ({
      id: row.id,
      teamId: row.teamId,
      platform: row.platform as CollaborationPlatform,
      tenantId: row.tenantId,
      externalTeamId: row.externalTeamId,
      externalChannelId: row.externalChannelId,
      externalChatId: row.externalChatId,
      externalUserId: row.externalUserId,
      displayName: row.displayName,
      installedById: row.installedById,
      metadata:
        safeJsonParse<Record<string, unknown>>(row.metadata ?? "{}") ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async saveTeamsInstallation(params: {
    teamId: number;
    installedById: number;
    input: SaveTeamsCollaborationInstallationInput;
  }): Promise<TeamCollaborationInstallation> {
    const now = Date.now();
    const contextKey = buildTeamsContextKey(params.input);
    const metadata = JSON.stringify(params.input.metadata ?? {});

    await this.db
      .insert(teamCollaborationInstallations)
      .values({
        teamId: params.teamId,
        platform: "teams",
        contextKey,
        tenantId: params.input.tenantId,
        externalTeamId: params.input.externalTeamId ?? null,
        externalChannelId: params.input.externalChannelId ?? null,
        externalChatId: params.input.externalChatId ?? null,
        externalUserId: params.input.externalUserId ?? null,
        displayName: params.input.displayName ?? null,
        installedById: params.installedById,
        metadata,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          teamCollaborationInstallations.platform,
          teamCollaborationInstallations.contextKey,
        ],
        set: {
          teamId: params.teamId,
          tenantId: params.input.tenantId,
          externalTeamId: params.input.externalTeamId ?? null,
          externalChannelId: params.input.externalChannelId ?? null,
          externalChatId: params.input.externalChatId ?? null,
          externalUserId: params.input.externalUserId ?? null,
          displayName: params.input.displayName ?? null,
          installedById: params.installedById,
          metadata,
          updatedAt: now,
        },
      });

    const saved = await this.db
      .select()
      .from(teamCollaborationInstallations)
      .where(
        and(
          eq(teamCollaborationInstallations.platform, "teams"),
          eq(teamCollaborationInstallations.contextKey, contextKey),
        ),
      )
      .get();

    if (!saved) {
      throw new Error("Failed to save Teams installation");
    }

    return {
      id: saved.id,
      teamId: saved.teamId,
      platform: saved.platform as CollaborationPlatform,
      tenantId: saved.tenantId,
      externalTeamId: saved.externalTeamId,
      externalChannelId: saved.externalChannelId,
      externalChatId: saved.externalChatId,
      externalUserId: saved.externalUserId,
      displayName: saved.displayName,
      installedById: saved.installedById,
      metadata:
        safeJsonParse<Record<string, unknown>>(saved.metadata ?? "{}") ?? {},
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async deleteForTeam(teamId: number, installationId: number): Promise<boolean> {
    const existing = await this.db
      .select({ id: teamCollaborationInstallations.id })
      .from(teamCollaborationInstallations)
      .where(
        and(
          eq(teamCollaborationInstallations.teamId, teamId),
          eq(teamCollaborationInstallations.id, installationId),
        ),
      )
      .get();

    if (!existing) {
      return false;
    }

    await this.db
      .delete(teamCollaborationInstallations)
      .where(eq(teamCollaborationInstallations.id, installationId));

    return true;
  }
}
