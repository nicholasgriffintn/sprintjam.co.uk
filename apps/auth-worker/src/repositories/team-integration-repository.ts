import { drizzle } from "drizzle-orm/d1";
import { and, eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { teamIntegrations } from "@sprintjam/db";
import * as schema from "@sprintjam/db/d1/schemas";
import type {
  GithubOAuthCredentials,
  JiraOAuthCredentials,
  LinearOAuthCredentials,
  OAuthProvider,
} from "@sprintjam/types";
import { safeJsonParse, TokenCipher } from "@sprintjam/utils";

type JiraMetadata = {
  jiraDomain?: string;
  jiraCloudId?: string | null;
  jiraUserId?: string | null;
  jiraUserEmail?: string | null;
  storyPointsField?: string | null;
  sprintField?: string | null;
};

type LinearMetadata = {
  linearOrganizationId?: string | null;
  linearUserId?: string | null;
  linearUserEmail?: string | null;
  estimateField?: string | null;
};

type GithubMetadata = {
  githubLogin?: string | null;
  githubUserEmail?: string | null;
  defaultOwner?: string | null;
  defaultRepo?: string | null;
};

export class TeamIntegrationRepository {
  private db: ReturnType<typeof drizzle>;
  private tokenCipher: TokenCipher;

  constructor(d1: D1Database, encryptionSecret: string) {
    this.db = drizzle(d1, { schema });
    this.tokenCipher = new TokenCipher(encryptionSecret);
  }

  private async encryptToken(
    value: string | null | undefined,
  ): Promise<string | null> {
    if (value == null) return null;
    return this.tokenCipher.encrypt(value);
  }

  private async decryptToken(
    value: string | null | undefined,
  ): Promise<string | null> {
    if (value == null) return null;
    return this.tokenCipher.decrypt(value);
  }

  private where(teamId: number, provider: OAuthProvider) {
    return and(
      eq(teamIntegrations.teamId, teamId),
      eq(teamIntegrations.provider, provider),
    );
  }

  async listIntegrationStatuses(teamId: number) {
    const rows = await this.db
      .select({
        provider: teamIntegrations.provider,
        authorizedBy: teamIntegrations.authorizedBy,
        expiresAt: teamIntegrations.expiresAt,
        metadata: teamIntegrations.metadata,
      })
      .from(teamIntegrations)
      .where(eq(teamIntegrations.teamId, teamId));

    return rows.map((row) => ({
      provider: row.provider as OAuthProvider,
      connected: true,
      authorizedBy: row.authorizedBy,
      expiresAt: row.expiresAt,
      metadata:
        safeJsonParse<Record<string, unknown>>(row.metadata ?? "{}") ?? {},
    }));
  }

  private async saveIntegration(params: {
    teamId: number;
    provider: OAuthProvider;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    authorizedBy: string;
    metadata: string;
  }): Promise<void> {
    const now = Date.now();
    const encryptedAccessToken = await this.tokenCipher.encrypt(
      params.accessToken,
    );
    const encryptedRefreshToken = await this.encryptToken(params.refreshToken);

    await this.db
      .insert(teamIntegrations)
      .values({
        teamId: params.teamId,
        provider: params.provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: params.tokenType,
        expiresAt: params.expiresAt,
        scope: params.scope,
        authorizedBy: params.authorizedBy,
        metadata: params.metadata,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [teamIntegrations.teamId, teamIntegrations.provider],
        set: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenType: params.tokenType,
          expiresAt: params.expiresAt,
          scope: params.scope,
          authorizedBy: params.authorizedBy,
          metadata: params.metadata,
          updatedAt: now,
        },
      });
  }

  private async getCredentials<TMetadata extends Record<string, unknown>>(
    teamId: number,
    provider: OAuthProvider,
  ): Promise<{
    core: {
      teamId: number;
      accessToken: string;
      refreshToken: string | null;
      tokenType: string;
      expiresAt: number;
      scope: string | null;
      authorizedBy: string;
    };
    metadata: TMetadata;
  } | null> {
    const row = await this.db
      .select()
      .from(teamIntegrations)
      .where(this.where(teamId, provider))
      .get();

    if (!row) return null;

    const accessToken = await this.tokenCipher.decrypt(row.accessToken);
    const refreshToken = await this.decryptToken(row.refreshToken);
    const metadata =
      safeJsonParse<TMetadata>(row.metadata ?? "{}") ?? ({} as TMetadata);

    return {
      core: {
        teamId: row.teamId,
        accessToken,
        refreshToken,
        tokenType: row.tokenType,
        expiresAt: row.expiresAt,
        scope: row.scope,
        authorizedBy: row.authorizedBy,
      },
      metadata,
    };
  }

  async updateTokens(
    teamId: number,
    provider: OAuthProvider,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
  ): Promise<void> {
    const encryptedAccessToken = await this.tokenCipher.encrypt(accessToken);
    const encryptedRefreshToken = await this.encryptToken(refreshToken);

    await this.db
      .update(teamIntegrations)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        updatedAt: Date.now(),
      })
      .where(this.where(teamId, provider));
  }

  async deleteIntegration(
    teamId: number,
    provider: OAuthProvider,
  ): Promise<void> {
    await this.db.delete(teamIntegrations).where(this.where(teamId, provider));
  }

  async getJiraCredentials(
    teamId: number,
  ): Promise<JiraOAuthCredentials | null> {
    const result = await this.getCredentials<JiraMetadata>(teamId, "jira");
    if (!result) return null;

    return {
      ...result.core,
      roomKey: `team:${teamId}`,
      id: 0,
      createdAt: 0,
      updatedAt: 0,
      jiraDomain: result.metadata.jiraDomain ?? "",
      jiraCloudId: result.metadata.jiraCloudId ?? null,
      jiraUserId: result.metadata.jiraUserId ?? null,
      jiraUserEmail: result.metadata.jiraUserEmail ?? null,
      storyPointsField: result.metadata.storyPointsField ?? null,
      sprintField: result.metadata.sprintField ?? null,
    };
  }

  async saveJiraCredentials(params: {
    teamId: number;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    authorizedBy: string;
    jiraDomain: string;
    jiraCloudId: string | null;
    jiraUserId: string | null;
    jiraUserEmail: string | null;
    storyPointsField: string | null;
    sprintField: string | null;
  }): Promise<void> {
    await this.saveIntegration({
      teamId: params.teamId,
      provider: "jira",
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      tokenType: params.tokenType,
      expiresAt: params.expiresAt,
      scope: params.scope,
      authorizedBy: params.authorizedBy,
      metadata: JSON.stringify({
        jiraDomain: params.jiraDomain,
        jiraCloudId: params.jiraCloudId,
        jiraUserId: params.jiraUserId,
        jiraUserEmail: params.jiraUserEmail,
        storyPointsField: params.storyPointsField,
        sprintField: params.sprintField,
      } satisfies JiraMetadata),
    });
  }

  async getLinearCredentials(
    teamId: number,
  ): Promise<LinearOAuthCredentials | null> {
    const result = await this.getCredentials<LinearMetadata>(teamId, "linear");
    if (!result) return null;

    return {
      ...result.core,
      roomKey: `team:${teamId}`,
      id: 0,
      createdAt: 0,
      updatedAt: 0,
      linearOrganizationId: result.metadata.linearOrganizationId ?? null,
      linearUserId: result.metadata.linearUserId ?? null,
      linearUserEmail: result.metadata.linearUserEmail ?? null,
      estimateField: result.metadata.estimateField ?? null,
    };
  }

  async saveLinearCredentials(params: {
    teamId: number;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    authorizedBy: string;
    linearOrganizationId: string | null;
    linearUserId: string | null;
    linearUserEmail: string | null;
    estimateField: string | null;
  }): Promise<void> {
    await this.saveIntegration({
      teamId: params.teamId,
      provider: "linear",
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      tokenType: params.tokenType,
      expiresAt: params.expiresAt,
      scope: params.scope,
      authorizedBy: params.authorizedBy,
      metadata: JSON.stringify({
        linearOrganizationId: params.linearOrganizationId,
        linearUserId: params.linearUserId,
        linearUserEmail: params.linearUserEmail,
        estimateField: params.estimateField,
      } satisfies LinearMetadata),
    });
  }

  async getGithubCredentials(
    teamId: number,
  ): Promise<GithubOAuthCredentials | null> {
    const result = await this.getCredentials<GithubMetadata>(teamId, "github");
    if (!result) return null;

    return {
      ...result.core,
      roomKey: `team:${teamId}`,
      id: 0,
      createdAt: 0,
      updatedAt: 0,
      githubLogin: result.metadata.githubLogin ?? null,
      githubUserEmail: result.metadata.githubUserEmail ?? null,
      defaultOwner: result.metadata.defaultOwner ?? null,
      defaultRepo: result.metadata.defaultRepo ?? null,
    };
  }

  async saveGithubCredentials(params: {
    teamId: number;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string;
    expiresAt: number;
    scope: string | null;
    authorizedBy: string;
    githubLogin: string | null;
    githubUserEmail: string | null;
    defaultOwner: string | null;
    defaultRepo: string | null;
  }): Promise<void> {
    await this.saveIntegration({
      teamId: params.teamId,
      provider: "github",
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      tokenType: params.tokenType,
      expiresAt: params.expiresAt,
      scope: params.scope,
      authorizedBy: params.authorizedBy,
      metadata: JSON.stringify({
        githubLogin: params.githubLogin,
        githubUserEmail: params.githubUserEmail,
        defaultOwner: params.defaultOwner,
        defaultRepo: params.defaultRepo,
      } satisfies GithubMetadata),
    });
  }
}
