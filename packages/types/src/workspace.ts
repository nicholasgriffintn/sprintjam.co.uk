/**
 * Workspace authentication and team management types
 */

export interface Team {
  id: number;
  name: string;
  organisationId: number;
  ownerId: number;
  createdAt: number;
  updatedAt?: number;
}

export interface TeamSession {
  id: number;
  teamId: number;
  roomKey: string;
  name: string;
  createdById: number;
  createdAt: number;
  updatedAt: number | null;
  completedAt: number | null;
  metadata: string | null;
}

export interface WorkspaceStats {
  totalTeams: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
}

export interface User {
  id: number;
  email: string;
  emailDomain: string;
  organisationId: number;
  name: string | null;
}

export interface Organisation {
  id: number;
  domain: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
