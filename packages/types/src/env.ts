import type {
  DurableObjectNamespace,
  Fetcher,
  RateLimit,
  D1Database,
} from "@cloudflare/workers-types";

/**
 * Base environment variables shared across all workers
 */
export interface BaseEnv {
  ENABLE_JOIN_RATE_LIMIT?: string;
  ENVIRONMENT?: string;
}

/**
 * Environment for the dispatch worker
 */
export interface DispatchWorkerEnv extends BaseEnv {
  ASSETS: Fetcher;
  ROOM_WORKER: Fetcher;
  AUTH_WORKER: Fetcher;
  STATS_WORKER: Fetcher;
}

/**
 * Environment for the room worker
 */
export interface RoomWorkerEnv extends BaseEnv {
  JOIN_RATE_LIMITER: RateLimit;
  PLANNING_ROOM: DurableObjectNamespace;
  TOKEN_ENCRYPTION_SECRET: string;
  JIRA_OAUTH_CLIENT_ID?: string;
  JIRA_OAUTH_CLIENT_SECRET?: string;
  JIRA_OAUTH_REDIRECT_URI?: string;
  LINEAR_OAUTH_CLIENT_ID?: string;
  LINEAR_OAUTH_CLIENT_SECRET?: string;
  LINEAR_OAUTH_REDIRECT_URI?: string;
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  GITHUB_OAUTH_REDIRECT_URI?: string;
  FEEDBACK_GITHUB_TOKEN?: string;
  POLYCHAT_API_TOKEN?: string;
  STATS_WORKER: Fetcher;
  STATS_INGEST_TOKEN?: string;
}

/**
 * Environment for the auth worker
 */
export interface AuthWorkerEnv extends BaseEnv {
  DB: D1Database;
  RESEND_API_KEY: string;
  TOKEN_ENCRYPTION_SECRET: string;
  ENABLE_MAGIC_LINK_RATE_LIMIT?: string;
  MAGIC_LINK_RATE_LIMITER: RateLimit;
  VERIFICATION_RATE_LIMITER: RateLimit;
  IP_RATE_LIMITER: RateLimit;
}

/**
 * Environment for the stats worker
 */
export interface StatsWorkerEnv extends BaseEnv {
  DB: D1Database;
  STATS_INGEST_TOKEN: string;
}
