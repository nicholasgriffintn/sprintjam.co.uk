import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";
import * as utils from "@sprintjam/utils";

import {
  listTeamsController,
  createTeamController,
  getTeamController,
  updateTeamController,
  deleteTeamController,
  listTeamSessionsController,
  createTeamSessionController,
  getTeamSessionController,
  completeSessionByRoomKeyController,
  getWorkspaceStatsController,
} from "./teams-controller";
import { WorkspaceAuthRepository } from "../repositories/workspace-auth";

vi.mock("../repositories/workspace-auth", () => ({
  WorkspaceAuthRepository: vi.fn(),
}));
vi.mock("@sprintjam/utils", async () => {
  const actual = await vi.importActual("@sprintjam/utils");
  return {
    ...actual,
    hashToken: vi.fn(),
  };
});

describe("listTeamsController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getUserTeams: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 401 when not authenticated", async () => {
    const request = new Request("https://test.com/teams", {
      method: "GET",
    });

    const response = await listTeamsController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when session is expired", async () => {
    mockRepo.validateSession.mockResolvedValue(null);

    const request = new Request("https://test.com/teams", {
      method: "GET",
      headers: { Authorization: "Bearer expired-token" },
    });

    const response = await listTeamsController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Session expired");
  });

  it("should return user teams for valid session", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getUserTeams.mockResolvedValue([
      { id: 1, name: "Team A", organisationId: 1, ownerId: 1 },
      { id: 2, name: "Team B", organisationId: 1, ownerId: 1 },
    ]);

    const request = new Request("https://test.com/teams", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await listTeamsController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.teams).toHaveLength(2);
  });
});

describe("createTeamController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getUserById: vi.fn(),
      createTeam: vi.fn(),
      getTeamById: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 401 when not authenticated", async () => {
    const request = new Request("https://test.com/teams", {
      method: "POST",
      body: JSON.stringify({ name: "New Team" }),
    });

    const response = await createTeamController(request, mockEnv);
    expect(response.status).toBe(401);
  });

  it("should return 400 when team name is missing", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });

    const request = new Request("https://test.com/teams", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await createTeamController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Team name is required");
  });

  it("should return 400 when team name is too long", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });

    const request = new Request("https://test.com/teams", {
      method: "POST",
      body: JSON.stringify({ name: "a".repeat(101) }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await createTeamController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Team name must be 100 characters or less");
  });

  it("should return 404 when user not found", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getUserById.mockResolvedValue(null);

    const request = new Request("https://test.com/teams", {
      method: "POST",
      body: JSON.stringify({ name: "New Team" }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await createTeamController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should successfully create team", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    mockRepo.createTeam.mockResolvedValue(10);
    mockRepo.getTeamById.mockResolvedValue({
      id: 10,
      name: "New Team",
      organisationId: 1,
      ownerId: 1,
    });

    const request = new Request("https://test.com/teams", {
      method: "POST",
      body: JSON.stringify({ name: "New Team" }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await createTeamController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.team.name).toBe("New Team");
    expect(mockRepo.createTeam).toHaveBeenCalledWith(1, "New Team", 1);
  });

  it("should trim team name", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.createTeam.mockResolvedValue(10);
    mockRepo.getTeamById.mockResolvedValue({
      id: 10,
      name: "Trimmed Team",
      organisationId: 1,
      ownerId: 1,
    });

    const request = new Request("https://test.com/teams", {
      method: "POST",
      body: JSON.stringify({ name: "  Trimmed Team  " }),
      headers: { Authorization: "Bearer valid-token" },
    });

    await createTeamController(request, mockEnv);

    expect(mockRepo.createTeam).toHaveBeenCalledWith(1, "Trimmed Team", 1);
  });
});

describe("getTeamController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getTeamById: vi.fn(),
      getUserById: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 404 when team not found", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue(null);

    const request = new Request("https://test.com/teams/1", {
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getTeamController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Team not found");
  });

  it("should return 403 when user from different organisation", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      name: "Team A",
      organisationId: 2,
      ownerId: 5,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });

    const request = new Request("https://test.com/teams/1", {
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getTeamController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("should return team for authorized user", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      name: "Team A",
      organisationId: 1,
      ownerId: 1,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });

    const request = new Request("https://test.com/teams/1", {
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getTeamController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.team.name).toBe("Team A");
  });
});

describe("updateTeamController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getTeamById: vi.fn(),
      updateTeam: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 403 when non-owner tries to update", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 2,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      name: "Team A",
      ownerId: 1,
    });

    const request = new Request("https://test.com/teams/1", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Team" }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await updateTeamController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only the team owner can update the team");
  });

  it("should successfully update team name", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById
      .mockResolvedValueOnce({ id: 1, name: "Old Team", ownerId: 1 })
      .mockResolvedValueOnce({ id: 1, name: "Updated Team", ownerId: 1 });

    const request = new Request("https://test.com/teams/1", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Team" }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await updateTeamController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.team.name).toBe("Updated Team");
    expect(mockRepo.updateTeam).toHaveBeenCalledWith(1, {
      name: "Updated Team",
    });
  });
});

describe("deleteTeamController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getTeamById: vi.fn(),
      deleteTeam: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 403 when non-owner tries to delete", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 2,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      name: "Team A",
      ownerId: 1,
    });

    const request = new Request("https://test.com/teams/1", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await deleteTeamController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only the team owner can delete the team");
  });

  it("should successfully delete team", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      name: "Team A",
      ownerId: 1,
    });

    const request = new Request("https://test.com/teams/1", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await deleteTeamController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Team deleted successfully");
    expect(mockRepo.deleteTeam).toHaveBeenCalledWith(1);
  });
});

describe("listTeamSessionsController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getTeamById: vi.fn(),
      getUserById: vi.fn(),
      getTeamSessions: vi.fn(),
      isTeamOwner: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 403 when user from different organisation", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      organisationId: 2,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.isTeamOwner.mockResolvedValue(false);

    const request = new Request("https://test.com/teams/1/sessions", {
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await listTeamSessionsController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only the team owner can access team sessions");
  });

  it("should return team sessions for authorized user", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.isTeamOwner.mockResolvedValue(true);
    mockRepo.getTeamSessions.mockResolvedValue([
      { id: 1, name: "Session 1", teamId: 1, roomKey: "room1" },
      { id: 2, name: "Session 2", teamId: 1, roomKey: "room2" },
    ]);

    const request = new Request("https://test.com/teams/1/sessions", {
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await listTeamSessionsController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toHaveLength(2);
  });
});

describe("createTeamSessionController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getTeamById: vi.fn(),
      getUserById: vi.fn(),
      createTeamSession: vi.fn(),
      getTeamSessionById: vi.fn(),
      isTeamOwner: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return 400 when session name is missing", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.isTeamOwner.mockResolvedValue(true);

    const request = new Request("https://test.com/teams/1/sessions", {
      method: "POST",
      body: JSON.stringify({ roomKey: "room1" }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await createTeamSessionController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Session name is required");
  });

  it("should return 400 when room key is missing", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.isTeamOwner.mockResolvedValue(true);

    const request = new Request("https://test.com/teams/1/sessions", {
      method: "POST",
      body: JSON.stringify({ name: "Session 1" }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await createTeamSessionController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Room key is required");
  });

  it("should successfully create team session", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getTeamById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.getUserById.mockResolvedValue({
      id: 1,
      organisationId: 1,
    });
    mockRepo.isTeamOwner.mockResolvedValue(true);
    mockRepo.createTeamSession.mockResolvedValue(10);
    mockRepo.getTeamSessionById.mockResolvedValue({
      id: 10,
      teamId: 1,
      name: "Session 1",
      roomKey: "room1",
    });

    const request = new Request("https://test.com/teams/1/sessions", {
      method: "POST",
      body: JSON.stringify({
        name: "Session 1",
        roomKey: "room1",
        metadata: { type: "sprint-planning" },
      }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await createTeamSessionController(request, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.session.name).toBe("Session 1");
    expect(mockRepo.createTeamSession).toHaveBeenCalledWith(
      1,
      "room1",
      "Session 1",
      1,
      { type: "sprint-planning" },
    );
  });
});

describe("completeSessionByRoomKeyController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      completeLatestSessionByRoomKey: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("marks latest session complete for room key", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.completeLatestSessionByRoomKey.mockResolvedValue({
      id: 2,
      teamId: 1,
      completedAt: 1700000000000,
    });

    const request = new Request("https://test.com/sessions/complete", {
      method: "POST",
      body: JSON.stringify({ roomKey: "ROOM1" }),
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await completeSessionByRoomKeyController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.completedAt).toBe(1700000000000);
    expect(mockRepo.completeLatestSessionByRoomKey).toHaveBeenCalledWith(
      "ROOM1",
      1,
    );
  });
});

describe("getWorkspaceStatsController", () => {
  let mockEnv: AuthWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as AuthWorkerEnv;

    mockRepo = {
      validateSession: vi.fn(),
      getWorkspaceStats: vi.fn(),
    };

    vi.mocked(WorkspaceAuthRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(utils.hashToken).mockResolvedValue("hashed-token");
  });

  it("should return workspace stats for authenticated user", async () => {
    mockRepo.validateSession.mockResolvedValue({
      userId: 1,
      email: "test@example.com",
    });
    mockRepo.getWorkspaceStats.mockResolvedValue({
      totalTeams: 3,
      totalSessions: 15,
      activeSessions: 2,
      completedSessions: 13,
    });

    const request = new Request("https://test.com/workspace/stats", {
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getWorkspaceStatsController(request, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalTeams).toBe(3);
    expect(data.totalSessions).toBe(15);
  });
});
