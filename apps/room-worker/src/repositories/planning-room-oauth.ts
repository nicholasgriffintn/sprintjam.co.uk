import { and, eq } from "drizzle-orm";

import { oauthCredentials } from "@sprintjam/db/durable-objects/schemas";
import type {
  DB,
  OauthCredentialsItem as DbOauthCredentialsItem,
} from "@sprintjam/db";
import type {
  GithubOAuthCredentials,
  JiraOAuthCredentials,
  LinearOAuthCredentials,
  OAuthProvider,
} from "@sprintjam/types";
import { safeJsonParse, type TokenCipher } from "@sprintjam/utils";

type OAuthCredentialCore = Omit<
  DbOauthCredentialsItem,
  "provider" | "metadata"
>;

type SaveOAuthCredentialInput<TCredential> = Omit<
  TCredential,
  "id" | "createdAt" | "updatedAt" | "expiresAt"
> & {
  expiresAt: number;
};

type SaveJiraOAuthCredentialsInput =
  SaveOAuthCredentialInput<JiraOAuthCredentials>;
type SaveLinearOAuthCredentialsInput =
  SaveOAuthCredentialInput<LinearOAuthCredentials>;
type SaveGithubOAuthCredentialsInput =
  SaveOAuthCredentialInput<GithubOAuthCredentials>;

type JiraCredentialMetadata = Partial<
  Pick<
    JiraOAuthCredentials,
    | "jiraDomain"
    | "jiraCloudId"
    | "jiraUserId"
    | "jiraUserEmail"
    | "storyPointsField"
    | "sprintField"
  >
>;

type LinearCredentialMetadata = Partial<
  Pick<
    LinearOAuthCredentials,
    | "linearOrganizationId"
    | "linearUserId"
    | "linearUserEmail"
    | "estimateField"
  >
>;

type GithubCredentialMetadata = Partial<
  Pick<
    GithubOAuthCredentials,
    "githubLogin" | "githubUserEmail" | "defaultOwner" | "defaultRepo"
  >
>;

export class PlanningRoomOAuthStore {
  constructor(
    private readonly db: DB,
    private readonly tokenCipher: TokenCipher,
  ) {
    if (!tokenCipher) {
      throw new Error("Token cipher is required");
    }
  }

  private async encryptToken(
    value: string | null | undefined,
  ): Promise<string | null> {
    if (value === null || value === undefined) {
      return null;
    }
    return this.tokenCipher.encrypt(value);
  }

  private async decryptToken(
    value: string | null | undefined,
  ): Promise<string | null> {
    if (value === null || value === undefined) {
      return null;
    }
    return this.tokenCipher.decrypt(value);
  }

  private oauthProviderWhere(roomKey: string, provider: OAuthProvider) {
    return and(
      eq(oauthCredentials.roomKey, roomKey),
      eq(oauthCredentials.provider, provider),
    );
  }

  private getOAuthCredentialRecord(roomKey: string, provider: OAuthProvider) {
    return this.db
      .select()
      .from(oauthCredentials)
      .where(this.oauthProviderWhere(roomKey, provider))
      .get();
  }

  private async getOAuthCredentialWithMetadata<
    TMetadata extends Record<string, unknown>,
  >(
    roomKey: string,
    provider: OAuthProvider,
  ): Promise<{ core: OAuthCredentialCore; metadata: TMetadata } | null> {
    const row = this.getOAuthCredentialRecord(roomKey, provider);
    if (!row) {
      return null;
    }

    const metadata = safeJsonParse<TMetadata>(row.metadata ?? "{}");
    const accessToken = await this.tokenCipher.decrypt(row.accessToken);
    const refreshToken = await this.decryptToken(row.refreshToken);

    return {
      core: {
        id: row.id,
        roomKey: row.roomKey,
        accessToken,
        refreshToken,
        tokenType: row.tokenType,
        expiresAt: row.expiresAt,
        scope: row.scope,
        authorizedBy: row.authorizedBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      metadata: (metadata ?? {}) as TMetadata,
    };
  }

  private async saveOAuthCredentials(params: {
    roomKey: string;
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

    this.db
      .insert(oauthCredentials)
      .values({
        roomKey: params.roomKey,
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
        target: [oauthCredentials.roomKey, oauthCredentials.provider],
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
      })
      .run();
  }

  private async updateOAuthTokens(params: {
    roomKey: string;
    provider: OAuthProvider;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number;
  }): Promise<void> {
    const encryptedAccessToken = await this.tokenCipher.encrypt(
      params.accessToken,
    );
    const encryptedRefreshToken = await this.encryptToken(params.refreshToken);

    this.db
      .update(oauthCredentials)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: params.expiresAt,
        updatedAt: Date.now(),
      })
      .where(this.oauthProviderWhere(params.roomKey, params.provider))
      .run();
  }

  private deleteOAuthCredentials(
    roomKey: string,
    provider: OAuthProvider,
  ): void {
    this.db
      .delete(oauthCredentials)
      .where(this.oauthProviderWhere(roomKey, provider))
      .run();
  }

  async getJiraOAuthCredentials(
    roomKey: string,
  ): Promise<JiraOAuthCredentials | null> {
    const credential =
      await this.getOAuthCredentialWithMetadata<JiraCredentialMetadata>(
        roomKey,
        "jira",
      );
    if (!credential) {
      return null;
    }

    return {
      ...credential.core,
      jiraDomain: credential.metadata.jiraDomain ?? "",
      jiraCloudId: credential.metadata.jiraCloudId ?? null,
      jiraUserId: credential.metadata.jiraUserId ?? null,
      jiraUserEmail: credential.metadata.jiraUserEmail ?? null,
      storyPointsField: credential.metadata.storyPointsField ?? null,
      sprintField: credential.metadata.sprintField ?? null,
    };
  }

  async saveJiraOAuthCredentials(
    credentials: SaveJiraOAuthCredentialsInput,
  ): Promise<void> {
    const metadata = JSON.stringify({
      jiraDomain: credentials.jiraDomain,
      jiraCloudId: credentials.jiraCloudId,
      jiraUserId: credentials.jiraUserId,
      jiraUserEmail: credentials.jiraUserEmail,
      storyPointsField: credentials.storyPointsField,
      sprintField: credentials.sprintField,
    });
    await this.saveOAuthCredentials({
      roomKey: credentials.roomKey,
      provider: "jira",
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenType: credentials.tokenType,
      expiresAt: credentials.expiresAt,
      scope: credentials.scope,
      authorizedBy: credentials.authorizedBy,
      metadata,
    });
  }

  async updateJiraOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
  ): Promise<void> {
    await this.updateOAuthTokens({
      roomKey,
      provider: "jira",
      accessToken,
      refreshToken,
      expiresAt,
    });
  }

  deleteJiraOAuthCredentials(roomKey: string): void {
    this.deleteOAuthCredentials(roomKey, "jira");
  }

  async getLinearOAuthCredentials(
    roomKey: string,
  ): Promise<LinearOAuthCredentials | null> {
    const credential =
      await this.getOAuthCredentialWithMetadata<LinearCredentialMetadata>(
        roomKey,
        "linear",
      );
    if (!credential) {
      return null;
    }

    return {
      ...credential.core,
      linearOrganizationId: credential.metadata.linearOrganizationId ?? null,
      linearUserId: credential.metadata.linearUserId ?? null,
      linearUserEmail: credential.metadata.linearUserEmail ?? null,
      estimateField: credential.metadata.estimateField ?? null,
    };
  }

  async saveLinearOAuthCredentials(
    credentials: SaveLinearOAuthCredentialsInput,
  ): Promise<void> {
    const metadata = JSON.stringify({
      linearOrganizationId: credentials.linearOrganizationId,
      linearUserId: credentials.linearUserId,
      linearUserEmail: credentials.linearUserEmail,
      estimateField: credentials.estimateField,
    });
    await this.saveOAuthCredentials({
      roomKey: credentials.roomKey,
      provider: "linear",
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenType: credentials.tokenType,
      expiresAt: credentials.expiresAt,
      scope: credentials.scope,
      authorizedBy: credentials.authorizedBy,
      metadata,
    });
  }

  async updateLinearOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
  ): Promise<void> {
    await this.updateOAuthTokens({
      roomKey,
      provider: "linear",
      accessToken,
      refreshToken,
      expiresAt,
    });
  }

  deleteLinearOAuthCredentials(roomKey: string): void {
    this.deleteOAuthCredentials(roomKey, "linear");
  }

  async updateLinearEstimateField(
    roomKey: string,
    estimateField: string | null,
  ): Promise<void> {
    const existing = await this.getLinearOAuthCredentials(roomKey);
    if (!existing) {
      return;
    }

    await this.saveLinearOAuthCredentials({
      roomKey: existing.roomKey,
      accessToken: existing.accessToken,
      refreshToken: existing.refreshToken,
      tokenType: existing.tokenType,
      expiresAt: existing.expiresAt,
      scope: existing.scope,
      linearOrganizationId: existing.linearOrganizationId,
      linearUserId: existing.linearUserId,
      linearUserEmail: existing.linearUserEmail,
      estimateField,
      authorizedBy: existing.authorizedBy,
    });
  }

  async getGithubOAuthCredentials(
    roomKey: string,
  ): Promise<GithubOAuthCredentials | null> {
    const credential =
      await this.getOAuthCredentialWithMetadata<GithubCredentialMetadata>(
        roomKey,
        "github",
      );
    if (!credential) {
      return null;
    }

    return {
      ...credential.core,
      githubLogin: credential.metadata.githubLogin ?? null,
      githubUserEmail: credential.metadata.githubUserEmail ?? null,
      defaultOwner: credential.metadata.defaultOwner ?? null,
      defaultRepo: credential.metadata.defaultRepo ?? null,
    };
  }

  async saveGithubOAuthCredentials(
    credentials: SaveGithubOAuthCredentialsInput,
  ): Promise<void> {
    const metadata = JSON.stringify({
      githubLogin: credentials.githubLogin,
      githubUserEmail: credentials.githubUserEmail,
      defaultOwner: credentials.defaultOwner,
      defaultRepo: credentials.defaultRepo,
    });
    await this.saveOAuthCredentials({
      roomKey: credentials.roomKey,
      provider: "github",
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenType: credentials.tokenType,
      expiresAt: credentials.expiresAt,
      scope: credentials.scope,
      authorizedBy: credentials.authorizedBy,
      metadata,
    });
  }

  deleteGithubOAuthCredentials(roomKey: string): void {
    this.deleteOAuthCredentials(roomKey, "github");
  }
}
