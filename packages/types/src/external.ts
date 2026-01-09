/**
 * External service integration types (Jira, Linear, GitHub)
 */

export interface OauthCredentialsItem {
  id: number;
  roomKey: string;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: number | null;
  scope: string | null;
  authorizedBy: string;
  createdAt: number;
  updatedAt: number;
}

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
