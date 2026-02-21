/**
 * External service integration types (Jira, Linear, GitHub)
 */
import type { OauthCredentialsItem as DbOauthCredentialsItem } from "@sprintjam/db";

export type OAuthProvider = "jira" | "linear" | "github";

export type OauthCredentialsItem = Pick<
  DbOauthCredentialsItem,
  | "id"
  | "roomKey"
  | "accessToken"
  | "refreshToken"
  | "tokenType"
  | "expiresAt"
  | "scope"
  | "authorizedBy"
  | "createdAt"
  | "updatedAt"
>;

type BaseOAuthCredentials = Pick<
  OauthCredentialsItem,
  | "id"
  | "roomKey"
  | "accessToken"
  | "refreshToken"
  | "tokenType"
  | "expiresAt"
  | "scope"
  | "authorizedBy"
  | "createdAt"
  | "updatedAt"
>;

export interface JiraOAuthCredentials extends BaseOAuthCredentials {
  jiraDomain: string;
  jiraCloudId: string | null;
  jiraUserId: string | null;
  jiraUserEmail: string | null;
  storyPointsField: string | null;
  sprintField: string | null;
}

export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status?: string;
  storyPoints?: number;
  url?: string;
}

export interface JiraFieldDefinition {
  id: string;
  name: string;
  schema?: {
    type?: string;
    system?: string;
    custom?: string;
    items?: string;
  };
}

export interface LinearOAuthCredentials extends BaseOAuthCredentials {
  linearOrganizationId: string | null;
  linearUserId: string | null;
  linearUserEmail: string | null;
  estimateField: string | null;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state?: string;
  estimate?: number;
  url?: string;
}

export interface GithubOAuthCredentials extends BaseOAuthCredentials {
  githubLogin: string | null;
  githubUserEmail: string | null;
  defaultOwner: string | null;
  defaultRepo: string | null;
}

export interface GithubIssue {
  id: string;
  key: string;
  repository: string;
  number: number;
  title: string;
  description?: string;
  status?: string;
  assignee?: string;
  estimate?: number | null;
  url?: string;
  labels?: string[];
}

export interface OAuthStatusBase {
  connected: boolean;
  expiresAt?: number;
}

export interface JiraOAuthStatus extends OAuthStatusBase {
  jiraDomain?: string;
  jiraUserEmail?: string;
  storyPointsField?: string | null;
  sprintField?: string | null;
}

export interface LinearOAuthStatus extends OAuthStatusBase {
  linearOrganizationId?: string;
  linearUserEmail?: string;
  estimateField?: string | null;
}

export interface GithubOAuthStatus extends OAuthStatusBase {
  githubLogin?: string | null;
  githubUserEmail?: string | null;
  defaultOwner?: string | null;
  defaultRepo?: string | null;
}

export interface JiraFieldOption {
  id: string;
  name: string;
  type?: string | null;
  custom?: boolean;
}

export interface JiraBoard {
  id: string;
  name: string;
  type?: string;
}

export interface JiraSprint {
  id: string;
  name: string;
  state?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearCycle {
  id: string;
  number: number;
  name?: string;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface GithubRepo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
}

export interface GithubMilestone {
  id: string;
  number: number;
  title: string;
  state?: string;
}
