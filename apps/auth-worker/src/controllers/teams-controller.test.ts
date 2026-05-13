import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthWorkerEnv } from "@sprintjam/types";

import {
  listTeamsController,
  createTeamController,
  getTeamController,
  updateTeamController,
  deleteTeamController,
  addTeamMemberController,
  requestTeamAccessController,
  approveTeamMemberController,
  approveWorkspaceMemberController,
  moveTeamMemberController,
  updateTeamMemberController,
  removeTeamMemberController,
  listTeamSessionsController,
  createTeamSessionController,
  getTeamSessionByRoomKeyController,
  updateTeamSessionController,
  resolveTeamSessionRecapActionController,
  completeSessionByRoomKeyController,
  getWorkspaceProfileController,
  getWorkspaceStatsController,
  updateWorkspaceProfileController,
  inviteWorkspaceMemberController,
} from "./teams-controller";
import {
  createWorkspaceActionController,
  createWorkspaceProcessLoopController,
  listWorkspaceActionsController,
  listWorkspaceProcessLoopsController,
  recordPlanningActionsByRoomKeyController,
  recordStandupActionsByRoomKeyController,
  recordWheelOutcomeByRoomKeyController,
  updateWorkspaceActionController,
} from "./workspace-action-controllers";
import * as auth from "../lib/auth";
import * as services from "@sprintjam/services";

const makeRequest = (input: RequestInfo | URL, init?: RequestInit): Request =>
  new Request(input, init);

vi.mock("../lib/auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: (result: { status?: string }) =>
    "status" in result && result.status === "error",
}));

vi.mock("@sprintjam/services", () => ({
  sendWorkspaceInviteEmail: vi.fn(),
}));

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  email: "admin@example.com",
  name: "Admin User",
  organisationId: 1,
  ...overrides,
});

const makeMembership = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  organisationId: 1,
  userId: 1,
  role: "member" as const,
  status: "active" as const,
  approvedById: 1,
  approvedAt: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const makeTeam = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  slug: "amber-cobalt-ripple",
  name: "Platform",
  logoUrl: null,
  organisationId: 1,
  ownerId: 2,
  accessPolicy: "open" as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const makeOrganisation = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  domain: "example.com",
  name: "Example",
  logoUrl: null,
  ownerId: 1,
  requireMemberApproval: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const makeInvite = (overrides: Record<string, unknown> = {}) => ({
  id: 15,
  organisationId: 1,
  email: "invitee@external.com",
  invitedById: 1,
  acceptedById: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  acceptedAt: null,
  revokedAt: null,
  ...overrides,
});

const createRepo = (overrides: Record<string, unknown> = {}) => ({
  getUserById: vi.fn().mockResolvedValue(makeUser()),
  getOrganisationMembership: vi
    .fn()
    .mockResolvedValue(makeMembership({ role: "admin", userId: 1 })),
  getOrganisationMemberById: vi.fn().mockResolvedValue(null),
  isOrganisationAdmin: vi.fn().mockResolvedValue(true),
  getOrganisationTeams: vi.fn().mockResolvedValue([]),
  getTeamMembership: vi.fn().mockResolvedValue(null),
  getTeamMemberById: vi.fn().mockResolvedValue(null),
  getTeamMembershipsForUser: vi.fn().mockResolvedValue([]),
  upsertTeamMembership: vi.fn(),
  approveTeamMembership: vi.fn(),
  approveWorkspaceMembership: vi.fn(),
  updateTeamMembershipRole: vi.fn(),
  removeTeamMembership: vi.fn(),
  listTeamMembers: vi.fn().mockResolvedValue([]),
  createTeam: vi.fn().mockResolvedValue(10),
  getTeamById: vi.fn().mockResolvedValue(makeTeam()),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  getTeamSessions: vi.fn().mockResolvedValue([]),
  countTeamSessions: vi.fn().mockResolvedValue(0),
  getTeamSessionCounts: vi.fn().mockResolvedValue({
    all: 0,
    planning: 0,
    standup: 0,
    wheel: 0,
    retro: 0,
  }),
  createTeamSession: vi.fn().mockResolvedValue(21),
  getOrganisationTeamSessionByRoomKey: vi.fn().mockResolvedValue(null),
  getAccessibleTeamSessionByRoomKey: vi.fn().mockResolvedValue(null),
  getTeamSessionById: vi.fn().mockResolvedValue({
    id: 21,
    teamId: 10,
    roomKey: "ROOM-1",
    name: "Sprint Planning",
  }),
  updateTeamSessionName: vi.fn(),
  updateTeamSessionMetadata: vi.fn(),
  getOrCreateWorkspaceProcessLoop: vi.fn(),
  linkTeamSessionToProcessLoop: vi.fn(),
  getProcessLoopForSession: vi.fn().mockResolvedValue(null),
  upsertWorkspaceAction: vi.fn().mockResolvedValue(31),
  getWorkspaceActionById: vi.fn().mockResolvedValue(null),
  listWorkspaceProcessLoops: vi.fn().mockResolvedValue([]),
  createWorkspaceProcessLoop: vi.fn().mockResolvedValue(11),
  getWorkspaceProcessLoopById: vi.fn().mockResolvedValue(null),
  listWorkspaceActions: vi.fn().mockResolvedValue([]),
  getWorkspaceActionCounts: vi.fn().mockResolvedValue({
    all: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    dismissed: 0,
  }),
  updateWorkspaceAction: vi.fn(),
  createWorkspaceActionEvent: vi.fn().mockResolvedValue(41),
  listWorkspaceActionEvents: vi.fn().mockResolvedValue([]),
  completeLatestSessionByRoomKey: vi.fn().mockResolvedValue({
    id: 21,
    teamId: 10,
    completedAt: 1700000000000,
  }),
  getWorkspaceStats: vi.fn().mockResolvedValue({
    totalTeams: 3,
    totalSessions: 12,
    activeSessions: 2,
    completedSessions: 10,
    sessionTypeCounts: {
      all: 12,
      planning: 7,
      standup: 4,
      wheel: 1,
      retro: 0,
    },
  }),
  updateOrganisation: vi.fn(),
  getOrganisationById: vi.fn().mockResolvedValue(makeOrganisation()),
  getOrganisationMembers: vi.fn().mockResolvedValue([]),
  listPendingWorkspaceInvites: vi.fn().mockResolvedValue([]),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  createOrUpdateWorkspaceInvite: vi.fn().mockResolvedValue(makeInvite()),
  ...overrides,
});

const authenticateAs = (repo: ReturnType<typeof createRepo>) => {
  vi.mocked(auth.authenticateRequest).mockResolvedValue({
    userId: 1,
    email: "admin@example.com",
    repo: repo as any,
  });
};

describe("teams-controller", () => {
  let env: AuthWorkerEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    env = {
      DB: {} as any,
    } as AuthWorkerEnv;
    vi.mocked(services.sendWorkspaceInviteEmail).mockResolvedValue(undefined);
  });

  it("returns 401 when listing teams without authentication", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      status: "error",
      code: "unauthorized",
    });

    const response = await listTeamsController(
      makeRequest("https://test.com/teams"),
      env,
    );

    expect(response.status).toBe(401);
  });

  it("lists teams using workspace membership and admin scope", async () => {
    const repo = createRepo({
      getOrganisationTeams: vi
        .fn()
        .mockResolvedValue([makeTeam({ id: 10, accessPolicy: "restricted" })]),
      getTeamMembershipsForUser: vi
        .fn()
        .mockResolvedValue([{ teamId: 10, role: "member", status: "active" }]),
    });
    authenticateAs(repo);

    const response = await listTeamsController(
      makeRequest("https://test.com/teams"),
      env,
    );
    const data = (await response.json()) as {
      teams: Array<{ canAccess: boolean; canManage: boolean }>;
    };

    expect(response.status).toBe(200);
    expect(repo.getOrganisationTeams).toHaveBeenCalledWith(1);
    expect(data.teams[0]).toEqual(
      expect.objectContaining({
        canAccess: true,
        canManage: true,
      }),
    );
  });

  it("blocks team creation when workspace access is not active", async () => {
    const repo = createRepo({
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ status: "pending" })),
    });
    authenticateAs(repo);

    const response = await createTeamController(
      makeRequest("https://test.com/teams", {
        method: "POST",
        body: JSON.stringify({ name: "New Team" }),
      }),
      env,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(data.error).toBe("Workspace access is not active");
  });

  it("creates a team with the default open access policy", async () => {
    const repo = createRepo({
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, name: "New Team" })),
    });
    authenticateAs(repo);

    const response = await createTeamController(
      makeRequest("https://test.com/teams", {
        method: "POST",
        body: JSON.stringify({ name: "New Team" }),
      }),
      env,
    );
    const data = (await response.json()) as { team: { name: string } };

    expect(response.status).toBe(201);
    expect(data.team.name).toBe("New Team");
    expect(repo.createTeam).toHaveBeenCalledWith(
      1,
      "New Team",
      1,
      "open",
      null,
    );
  });

  it("rejects access to a restricted team for non-members", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "restricted" })),
      getTeamMembership: vi.fn().mockResolvedValue(null),
    });
    authenticateAs(repo);

    const response = await getTeamController(
      makeRequest("https://test.com/teams/10"),
      env,
      10,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this team");
  });

  it("only allows team admins to update a team", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "restricted" })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
    });
    authenticateAs(repo);

    const response = await updateTeamController(
      makeRequest("https://test.com/teams/10", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Team" }),
      }),
      env,
      10,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(data.error).toBe("Only team admins can update the team");
  });

  it("lets a workspace admin update any team", async () => {
    const repo = createRepo({
      getTeamById: vi
        .fn()
        .mockResolvedValueOnce(makeTeam({ id: 10, name: "Old Team" }))
        .mockResolvedValueOnce(makeTeam({ id: 10, name: "Updated Team" })),
    });
    authenticateAs(repo);

    const response = await updateTeamController(
      makeRequest("https://test.com/teams/10", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Team" }),
      }),
      env,
      10,
    );
    const data = (await response.json()) as { team: { name: string } };

    expect(response.status).toBe(200);
    expect(data.team.name).toBe("Updated Team");
    expect(repo.updateTeam).toHaveBeenCalledWith(10, { name: "Updated Team" });
  });

  it("allows a team admin to delete a team", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "admin", status: "active" }),
    });
    authenticateAs(repo);

    const response = await deleteTeamController(
      makeRequest("https://test.com/teams/10", { method: "DELETE" }),
      env,
      10,
    );
    const data = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(data.message).toBe("Team deleted successfully");
    expect(repo.deleteTeam).toHaveBeenCalledWith(10);
  });

  it("adds an active workspace member to a team immediately", async () => {
    const repo = createRepo({
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "admin", userId: 1 })),
      getUserById: vi
        .fn()
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(
          makeUser({ id: 2, email: "member@example.com" }),
        ),
      getTeamMemberById: vi.fn().mockResolvedValue({
        id: 2,
        email: "member@example.com",
        name: "Member User",
        avatar: null,
        createdAt: Date.now(),
        lastLoginAt: null,
        role: "member",
        status: "active",
        approvedAt: Date.now(),
      }),
    });
    authenticateAs(repo);

    const response = await addTeamMemberController(
      makeRequest("https://test.com/teams/10/members", {
        method: "POST",
        body: JSON.stringify({ userId: 2, role: "member" }),
      }),
      env,
      10,
    );
    const data = (await response.json()) as { member: { status: string } };

    expect(response.status).toBe(201);
    expect(data.member.status).toBe("active");
    expect(repo.upsertTeamMembership).toHaveBeenCalledWith({
      teamId: 10,
      userId: 2,
      role: "member",
      status: "active",
      approvedById: 1,
    });
  });

  it("creates a pending access request for restricted teams", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member", userId: 1 })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "restricted" })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ role: "member", status: "pending" }),
    });
    authenticateAs(repo);

    const response = await requestTeamAccessController(
      makeRequest("https://test.com/teams/10/request-access", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      env,
      10,
    );
    const data = (await response.json()) as { member: { status: string } };

    expect(response.status).toBe(202);
    expect(data.member.status).toBe("pending");
    expect(repo.upsertTeamMembership).toHaveBeenCalledWith({
      teamId: 10,
      userId: 1,
      role: "member",
      status: "pending",
    });
  });

  it("does not create an access request for open teams", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member", userId: 1 })),
    });
    authenticateAs(repo);

    const response = await requestTeamAccessController(
      makeRequest("https://test.com/teams/10/request-access", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      env,
      10,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(data.error).toBe("Open teams do not require an access request");
    expect(repo.upsertTeamMembership).not.toHaveBeenCalled();
  });

  it("approves a pending team member", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce({ role: "admin", status: "active" })
        .mockResolvedValueOnce({ role: "member", status: "pending" }),
      getTeamMemberById: vi.fn().mockResolvedValue({
        id: 2,
        email: "member@example.com",
        name: "Member User",
        avatar: null,
        createdAt: Date.now(),
        lastLoginAt: null,
        role: "member",
        status: "active",
        approvedAt: Date.now(),
      }),
    });
    authenticateAs(repo);

    const response = await approveTeamMemberController(
      makeRequest("https://test.com/teams/10/members/2/approve", {
        method: "POST",
      }),
      env,
      10,
      2,
    );
    const data = (await response.json()) as { member: { status: string } };

    expect(response.status).toBe(200);
    expect(data.member.status).toBe("active");
    expect(repo.approveTeamMembership).toHaveBeenCalledWith(10, 2, 1);
  });

  it("rejects approving a team member who is already active", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce({ role: "admin", status: "active" })
        .mockResolvedValueOnce({ role: "member", status: "active" }),
    });
    authenticateAs(repo);

    const response = await approveTeamMemberController(
      makeRequest("https://test.com/teams/10/members/2/approve", {
        method: "POST",
      }),
      env,
      10,
      2,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(data.error).toBe("Member is not pending approval");
    expect(repo.approveTeamMembership).not.toHaveBeenCalled();
  });

  it("approves a pending workspace member", async () => {
    const repo = createRepo({
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValueOnce(makeMembership({ role: "admin", userId: 1 }))
        .mockResolvedValueOnce(
          makeMembership({ role: "member", userId: 2, status: "pending" }),
        ),
      getOrganisationMemberById: vi.fn().mockResolvedValue({
        id: 2,
        email: "member@example.com",
        name: "Member User",
        avatar: null,
        createdAt: Date.now(),
        lastLoginAt: null,
        role: "member",
        status: "active",
        approvedAt: Date.now(),
      }),
    });
    authenticateAs(repo);

    const response = await approveWorkspaceMemberController(
      makeRequest("https://test.com/workspace/members/2/approve", {
        method: "POST",
      }),
      env,
      2,
    );
    const data = (await response.json()) as { member: { status: string } };

    expect(response.status).toBe(200);
    expect(data.member.status).toBe("active");
    expect(repo.approveWorkspaceMembership).toHaveBeenCalledWith(1, 2, 1);
  });

  it("rejects approving a workspace member who is already active", async () => {
    const repo = createRepo({
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValueOnce(makeMembership({ role: "admin", userId: 1 }))
        .mockResolvedValueOnce(
          makeMembership({ role: "member", userId: 2, status: "active" }),
        ),
    });
    authenticateAs(repo);

    const response = await approveWorkspaceMemberController(
      makeRequest("https://test.com/workspace/members/2/approve", {
        method: "POST",
      }),
      env,
      2,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(data.error).toBe("Member is not pending approval");
    expect(repo.approveWorkspaceMembership).not.toHaveBeenCalled();
  });

  it("promotes a team member to admin", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce({ role: "admin", status: "active" })
        .mockResolvedValueOnce({ role: "member", status: "active" }),
      getTeamMemberById: vi.fn().mockResolvedValue({
        id: 2,
        email: "member@example.com",
        name: "Member User",
        avatar: null,
        createdAt: Date.now(),
        lastLoginAt: null,
        role: "admin",
        status: "active",
        approvedAt: Date.now(),
      }),
    });
    authenticateAs(repo);

    const response = await updateTeamMemberController(
      makeRequest("https://test.com/teams/10/members/2", {
        method: "PUT",
        body: JSON.stringify({ role: "admin" }),
      }),
      env,
      10,
      2,
    );
    const data = (await response.json()) as { member: { role: string } };

    expect(response.status).toBe(200);
    expect(data.member.role).toBe("admin");
    expect(repo.updateTeamMembershipRole).toHaveBeenCalledWith(10, 2, "admin");
  });

  it("prevents removing the last active team admin", async () => {
    const repo = createRepo({
      getTeamById: vi.fn().mockResolvedValue(makeTeam({ id: 10, ownerId: 9 })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce({ role: "admin", status: "active" })
        .mockResolvedValueOnce({ role: "admin", status: "active" }),
      listTeamMembers: vi.fn().mockResolvedValue([
        {
          id: 2,
          email: "member@example.com",
          name: "Member User",
          avatar: null,
          createdAt: Date.now(),
          lastLoginAt: null,
          role: "admin",
          status: "active",
          approvedAt: Date.now(),
        },
      ]),
    });
    authenticateAs(repo);

    const response = await removeTeamMemberController(
      makeRequest("https://test.com/teams/10/members/2", {
        method: "DELETE",
      }),
      env,
      10,
      2,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(data.error).toBe("At least one team admin is required");
    expect(repo.removeTeamMembership).not.toHaveBeenCalled();
  });

  it("allows a workspace admin to remove a team member when another admin remains", async () => {
    const repo = createRepo({
      getTeamById: vi.fn().mockResolvedValue(makeTeam({ id: 10, ownerId: 9 })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ role: "member", status: "active" }),
      listTeamMembers: vi.fn().mockResolvedValue([
        {
          id: 1,
          email: "admin@example.com",
          name: "Admin User",
          avatar: null,
          createdAt: Date.now(),
          lastLoginAt: null,
          role: "admin",
          status: "active",
          approvedAt: Date.now(),
        },
        {
          id: 3,
          email: "other-admin@example.com",
          name: "Other Admin",
          avatar: null,
          createdAt: Date.now(),
          lastLoginAt: null,
          role: "admin",
          status: "active",
          approvedAt: Date.now(),
        },
      ]),
    });
    authenticateAs(repo);

    const response = await removeTeamMemberController(
      makeRequest("https://test.com/teams/10/members/2", {
        method: "DELETE",
      }),
      env,
      10,
      2,
    );
    const data = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(data.message).toBe("Team member removed");
    expect(repo.removeTeamMembership).toHaveBeenCalledWith(10, 2);
  });

  it("prevents removing the team owner's membership row", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ role: "admin", status: "active" }),
      getTeamById: vi.fn().mockResolvedValue(makeTeam({ id: 10, ownerId: 2 })),
    });
    authenticateAs(repo);

    const response = await removeTeamMemberController(
      makeRequest("https://test.com/teams/10/members/2", {
        method: "DELETE",
      }),
      env,
      10,
      2,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(data.error).toBe("Team owner membership cannot be removed");
    expect(repo.removeTeamMembership).not.toHaveBeenCalled();
  });

  it("moves a team member server-side without separate client calls", async () => {
    const repo = createRepo({
      getTeamById: vi
        .fn()
        .mockResolvedValueOnce(makeTeam({ id: 10, ownerId: 9 }))
        .mockResolvedValueOnce(makeTeam({ id: 20, ownerId: 8 })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ role: "member", status: "active" })
        .mockResolvedValueOnce(null),
      getTeamMemberById: vi.fn().mockResolvedValue({
        id: 2,
        email: "member@example.com",
        name: "Member User",
        avatar: null,
        createdAt: Date.now(),
        lastLoginAt: null,
        role: "member",
        status: "active",
        approvedAt: Date.now(),
      }),
    });
    authenticateAs(repo);

    const response = await moveTeamMemberController(
      makeRequest("https://test.com/teams/10/members/2/move", {
        method: "POST",
        body: JSON.stringify({ targetTeamId: 20, role: "member" }),
      }),
      env,
      10,
      2,
    );
    const data = (await response.json()) as {
      member: { id: number };
      message: string;
    };

    expect(response.status).toBe(200);
    expect(data.message).toBe("Team member moved");
    expect(repo.upsertTeamMembership).toHaveBeenCalledWith({
      teamId: 20,
      userId: 2,
      role: "member",
      status: "active",
      approvedById: 1,
    });
    expect(repo.removeTeamMembership).toHaveBeenCalledWith(10, 2);
  });

  it("rolls back the target membership if a team move cannot remove the source member", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const repo = createRepo({
      getTeamById: vi
        .fn()
        .mockResolvedValueOnce(makeTeam({ id: 10, ownerId: 9 }))
        .mockResolvedValueOnce(makeTeam({ id: 20, ownerId: 8 })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ role: "admin", status: "active" })
        .mockResolvedValueOnce(null),
      listTeamMembers: vi.fn().mockResolvedValue([
        {
          id: 2,
          email: "member@example.com",
          name: "Member User",
          avatar: null,
          createdAt: Date.now(),
          lastLoginAt: null,
          role: "admin",
          status: "active",
          approvedAt: Date.now(),
        },
        {
          id: 3,
          email: "other-admin@example.com",
          name: "Other Admin",
          avatar: null,
          createdAt: Date.now(),
          lastLoginAt: null,
          role: "admin",
          status: "active",
          approvedAt: Date.now(),
        },
      ]),
      removeTeamMembership: vi
        .fn()
        .mockRejectedValueOnce(new Error("delete failed"))
        .mockResolvedValueOnce(undefined),
    });
    authenticateAs(repo);

    const response = await moveTeamMemberController(
      makeRequest("https://test.com/teams/10/members/2/move", {
        method: "POST",
        body: JSON.stringify({ targetTeamId: 20, role: "admin" }),
      }),
      env,
      10,
      2,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(data.error).toBe("Unable to move team member");
    expect(repo.upsertTeamMembership).toHaveBeenNthCalledWith(1, {
      teamId: 20,
      userId: 2,
      role: "admin",
      status: "active",
      approvedById: 1,
    });
    expect(repo.removeTeamMembership).toHaveBeenNthCalledWith(1, 10, 2);
    expect(repo.removeTeamMembership).toHaveBeenNthCalledWith(2, 20, 2);
    consoleErrorSpy.mockRestore();
  });

  it("lists team sessions for an authorised team member", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "restricted" })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getTeamSessions: vi
        .fn()
        .mockResolvedValue([{ id: 3, teamId: 10, roomKey: "ROOM-1" }]),
      getTeamSessionCounts: vi.fn().mockResolvedValue({
        all: 21,
        planning: 10,
        standup: 8,
        wheel: 3,
        retro: 0,
      }),
    });
    authenticateAs(repo);

    const response = await listTeamSessionsController(
      makeRequest(
        "https://test.com/teams/10/sessions?limit=10&offset=20&type=standup",
      ),
      env,
      10,
    );
    const data = (await response.json()) as {
      sessions: Array<{ id: number }>;
      pagination: { limit: number; offset: number; total: number };
      counts: {
        all: number;
        planning: number;
        standup: number;
        wheel: number;
        retro: number;
      };
    };

    expect(response.status).toBe(200);
    expect(repo.getTeamSessions).toHaveBeenCalledWith(
      10,
      {
        limit: 10,
        offset: 20,
      },
      "standup",
    );
    expect(data.sessions).toEqual([{ id: 3, teamId: 10, roomKey: "ROOM-1" }]);
    expect(data.pagination).toMatchObject({
      limit: 10,
      offset: 20,
      total: 8,
    });
    expect(data.counts).toEqual({
      all: 21,
      planning: 10,
      standup: 8,
      wheel: 3,
      retro: 0,
    });
  });

  it("rejects invalid team session pagination", async () => {
    const repo = createRepo();
    authenticateAs(repo);

    const response = await listTeamSessionsController(
      makeRequest("https://test.com/teams/10/sessions?limit=500"),
      env,
      10,
    );

    expect(response.status).toBe(400);
    expect(repo.getTeamSessions).not.toHaveBeenCalled();
  });

  it("prevents non-members from creating sessions in a restricted team", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "restricted" })),
      getTeamMembership: vi.fn().mockResolvedValue(null),
    });
    authenticateAs(repo);

    const response = await createTeamSessionController(
      makeRequest("https://test.com/teams/10/sessions", {
        method: "POST",
        body: JSON.stringify({ name: "Sprint Planning", roomKey: "ROOM-1" }),
      }),
      env,
      10,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "You must be a team member to create sessions in this team",
    );
  });

  it("creates a team session for an active team member", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "restricted" })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
    });
    authenticateAs(repo);

    const response = await createTeamSessionController(
      makeRequest("https://test.com/teams/10/sessions", {
        method: "POST",
        headers: { Cookie: "room_session=room-token" },
        body: JSON.stringify({
          name: "Sprint Planning",
          roomKey: "ROOM-1",
          metadata: { source: "manual" },
        }),
      }),
      env,
      10,
    );
    const data = (await response.json()) as { session: { id: number } };

    expect(response.status).toBe(201);
    expect(data.session.id).toBe(21);
    expect(repo.createTeamSession).toHaveBeenCalledWith(
      10,
      "ROOM-1",
      "Sprint Planning",
      1,
      { source: "manual" },
    );
  });

  it("creates a team session for a workspace admin without team membership", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(true),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "admin" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "restricted" })),
      getTeamMembership: vi.fn().mockResolvedValue(null),
    });
    authenticateAs(repo);

    const response = await createTeamSessionController(
      makeRequest("https://test.com/teams/10/sessions", {
        method: "POST",
        body: JSON.stringify({
          name: "Admin standup",
          roomKey: "ROOM-2",
          metadata: { type: "standup" },
        }),
      }),
      env,
      10,
    );

    expect(response.status).toBe(201);
    expect(repo.createTeamSession).toHaveBeenCalledWith(
      10,
      "ROOM-2",
      "Admin standup",
      1,
      { type: "standup" },
    );
  });

  it("links session metadata without recording actions during session creation", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "restricted" })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getOrCreateWorkspaceProcessLoop: vi.fn().mockResolvedValue({ id: 12 }),
    });
    authenticateAs(repo);

    const response = await createTeamSessionController(
      makeRequest("https://test.com/teams/10/sessions", {
        method: "POST",
        headers: { Cookie: "room_session=room-token" },
        body: JSON.stringify({
          name: "Sprint Planning",
          roomKey: "ROOM-1",
          metadata: {
            type: "planning",
            processLoop: {
              key: "team-10-2026-05-06",
              name: "Team loop 2026-05-06",
              status: "active",
            },
            planningFollowUps: ["Review API blocker"],
          },
        }),
      }),
      env,
      10,
    );

    expect(response.status).toBe(201);
    expect(repo.getOrCreateWorkspaceProcessLoop).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 10,
        key: "team-10-2026-05-06",
        createdById: 1,
      }),
    );
    expect(repo.linkTeamSessionToProcessLoop).toHaveBeenCalledWith({
      teamId: 10,
      processLoopId: 12,
      sessionId: 21,
      linkedById: 1,
    });
    expect(repo.upsertWorkspaceAction).not.toHaveBeenCalled();
  });

  it("creates process loops for accessible teams", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getWorkspaceProcessLoopById: vi.fn().mockResolvedValue({
        id: 11,
        teamId: 10,
        key: "sprint-42",
        name: "Sprint 42",
        status: "active",
      }),
    });
    authenticateAs(repo);

    const response = await createWorkspaceProcessLoopController(
      makeRequest("https://test.com/teams/10/process-loops", {
        method: "POST",
        body: JSON.stringify({
          key: "sprint-42",
          name: "Sprint 42",
          status: "active",
        }),
      }),
      env,
      10,
    );

    expect(response.status).toBe(201);
    expect(repo.createWorkspaceProcessLoop).toHaveBeenCalledWith(10, {
      key: "sprint-42",
      name: "Sprint 42",
      goal: null,
      status: "active",
      startsAt: null,
      endsAt: null,
      createdById: 1,
    });
  });

  it("lists process loops for accessible teams", async () => {
    const repo = createRepo({
      listWorkspaceProcessLoops: vi
        .fn()
        .mockResolvedValue([{ id: 11, teamId: 10, name: "Sprint 42" }]),
    });
    authenticateAs(repo);

    const response = await listWorkspaceProcessLoopsController(
      makeRequest("https://test.com/teams/10/process-loops"),
      env,
      10,
    );
    const data = (await response.json()) as { loops: unknown[] };

    expect(response.status).toBe(200);
    expect(data.loops).toHaveLength(1);
  });

  it("lists workspace actions with filters", async () => {
    const repo = createRepo({
      listWorkspaceActions: vi.fn().mockResolvedValue([{ id: 31, teamId: 10 }]),
      getWorkspaceActionCounts: vi.fn().mockResolvedValue({
        all: 1,
        open: 1,
        in_progress: 0,
        resolved: 0,
        dismissed: 0,
      }),
    });
    authenticateAs(repo);

    const response = await listWorkspaceActionsController(
      makeRequest(
        "https://test.com/teams/10/actions?status=open&source=standup&processLoopId=12",
      ),
      env,
      10,
    );

    expect(response.status).toBe(200);
    expect(repo.listWorkspaceActions).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ limit: 50, offset: 0 }),
      { status: "open", source: "standup", processLoopId: 12 },
    );
    expect(repo.getWorkspaceActionCounts).toHaveBeenCalledWith(10, {
      source: "standup",
      processLoopId: 12,
    });
  });

  it("creates manual workspace actions", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getWorkspaceActionById: vi.fn().mockResolvedValue({
        id: 31,
        teamId: 10,
        source: "manual",
        title: "Follow up dependency",
      }),
    });
    authenticateAs(repo);

    const response = await createWorkspaceActionController(
      makeRequest("https://test.com/teams/10/actions", {
        method: "POST",
        body: JSON.stringify({
          title: "Follow up dependency",
          priority: "high",
        }),
      }),
      env,
      10,
    );

    expect(response.status).toBe(201);
    expect(repo.upsertWorkspaceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 10,
        createdById: 1,
        source: "manual",
        title: "Follow up dependency",
        priority: "high",
      }),
    );
  });

  it("updates workspace action status and records an event", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getWorkspaceActionById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 31,
          teamId: 10,
          status: "open",
        })
        .mockResolvedValueOnce({
          id: 31,
          teamId: 10,
          status: "resolved",
        }),
    });
    authenticateAs(repo);

    const response = await updateWorkspaceActionController(
      makeRequest("https://test.com/teams/10/actions/31", {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      }),
      env,
      10,
      31,
    );

    expect(response.status).toBe(200);
    expect(repo.updateWorkspaceAction).toHaveBeenCalledWith(31, {
      status: "resolved",
      resolvedById: 1,
    });
    expect(repo.createWorkspaceActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 10,
        actionId: 31,
        eventType: "status_changed",
        fromStatus: "open",
        toStatus: "resolved",
      }),
    );
  });

  it("rejects duplicate room links within the workspace", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "open" })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getOrganisationTeamSessionByRoomKey: vi.fn().mockResolvedValue({
        id: 99,
        teamId: 11,
        roomKey: "ROOM-1",
        name: "Existing session",
      }),
    });
    authenticateAs(repo);

    const response = await createTeamSessionController(
      makeRequest("https://test.com/teams/10/sessions", {
        method: "POST",
        headers: { Cookie: "room_session=room-token" },
        body: JSON.stringify({
          name: "Sprint Planning",
          roomKey: "ROOM-1",
        }),
      }),
      env,
      10,
    );
    const data = (await response.json()) as { code: string; message: string };

    expect(response.status).toBe(409);
    expect(data.code).toBe("session_already_linked");
    expect(data.message).toBe("This room is already saved to your workspace");
    expect(repo.createTeamSession).not.toHaveBeenCalled();
  });

  it("returns a linked session by room key for accessible users", async () => {
    const repo = createRepo({
      getAccessibleTeamSessionByRoomKey: vi.fn().mockResolvedValue({
        id: 21,
        teamId: 10,
        roomKey: "ROOM-1",
        name: "Sprint Planning",
      }),
    });
    authenticateAs(repo);

    const response = await getTeamSessionByRoomKeyController(
      makeRequest("https://test.com/sessions/by-room?roomKey=ROOM-1"),
      env,
    );
    const data = (await response.json()) as {
      session: { id: number; roomKey: string };
    };

    expect(response.status).toBe(200);
    expect(data.session).toEqual(
      expect.objectContaining({ id: 21, roomKey: "ROOM-1" }),
    );
    expect(repo.getAccessibleTeamSessionByRoomKey).toHaveBeenCalledWith(
      "ROOM-1",
      1,
      1,
      true,
    );
  });

  it("returns null when no linked session exists for a room key", async () => {
    const repo = createRepo({
      getAccessibleTeamSessionByRoomKey: vi.fn().mockResolvedValue(null),
    });
    authenticateAs(repo);

    const response = await getTeamSessionByRoomKeyController(
      makeRequest("https://test.com/sessions/by-room?roomKey=ROOM-1"),
      env,
    );
    const data = (await response.json()) as {
      session: null;
    };

    expect(response.status).toBe(200);
    expect(data.session).toBeNull();
  });

  it("updates a linked session name", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
      getTeamById: vi
        .fn()
        .mockResolvedValue(makeTeam({ id: 10, accessPolicy: "open" })),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getTeamSessionById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 21,
          teamId: 10,
          roomKey: "ROOM-1",
          name: "Before",
        })
        .mockResolvedValueOnce({
          id: 21,
          teamId: 10,
          roomKey: "ROOM-1",
          name: "After",
        }),
    });
    authenticateAs(repo);

    const response = await updateTeamSessionController(
      makeRequest("https://test.com/teams/10/sessions/21", {
        method: "PUT",
        body: JSON.stringify({ name: "After" }),
      }),
      env,
      10,
      21,
    );
    const data = (await response.json()) as { session: { name: string } };

    expect(response.status).toBe(200);
    expect(data.session.name).toBe("After");
    expect(repo.updateTeamSessionName).toHaveBeenCalledWith(21, "After");
  });

  it("resolves a recap follow-up in session metadata", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getTeamSessionById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 21,
          teamId: 10,
          roomKey: "STAND-1",
          name: "Standup",
          metadata: JSON.stringify({
            type: "standup",
            planningFollowUps: ["Review API blocker"],
          }),
        })
        .mockResolvedValueOnce({
          id: 21,
          teamId: 10,
          roomKey: "STAND-1",
          name: "Standup",
        }),
    });
    authenticateAs(repo);

    const response = await resolveTeamSessionRecapActionController(
      makeRequest(
        "https://test.com/teams/10/sessions/21/recap-actions/resolve",
        {
          method: "POST",
          body: JSON.stringify({
            actionId: "planning-follow-up-21-review-api-blocker",
            kind: "planning_follow_up",
          }),
        },
      ),
      env,
      10,
      21,
    );

    expect(response.status).toBe(200);
    expect(repo.updateTeamSessionMetadata).toHaveBeenCalledWith(
      21,
      expect.objectContaining({
        type: "standup",
        planningFollowUps: [
          expect.objectContaining({
            title: "Review API blocker",
            status: "resolved",
            resolvedById: 1,
          }),
        ],
      }),
    );
  });

  it("resolves a wheel outcome in session metadata", async () => {
    const repo = createRepo({
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
      getTeamSessionById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 21,
          teamId: 10,
          roomKey: "WHEEL-1",
          name: "Wheel",
          metadata: JSON.stringify({
            type: "wheel",
            wheelOutcomes: [
              {
                id: "spin-1",
                mode: "decision",
                resultLabel: "Decision",
                winner: "Ship it",
                timestamp: 1_700_000_000_000,
                removedAfter: false,
                recordedAt: 1_700_000_000_100,
                automation: [],
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          id: 21,
          teamId: 10,
          roomKey: "WHEEL-1",
          name: "Wheel",
        }),
    });
    authenticateAs(repo);

    const response = await resolveTeamSessionRecapActionController(
      makeRequest(
        "https://test.com/teams/10/sessions/21/recap-actions/resolve",
        {
          method: "POST",
          body: JSON.stringify({
            actionId: "wheel-outcome-21-spin-1",
            kind: "wheel_outcome",
          }),
        },
      ),
      env,
      10,
      21,
    );

    expect(response.status).toBe(200);
    expect(repo.updateTeamSessionMetadata).toHaveBeenCalledWith(
      21,
      expect.objectContaining({
        type: "wheel",
        wheelOutcomes: [
          expect.objectContaining({
            id: "spin-1",
            status: "resolved",
            resolvedById: 1,
          }),
        ],
      }),
    );
  });

  it("completes the latest room session with workspace scope", async () => {
    const repo = createRepo({
      getAccessibleTeamSessionByRoomKey: vi.fn().mockResolvedValue({
        id: 21,
        teamId: 10,
        roomKey: "ROOM-1",
        name: "Sprint Planning",
        metadata: JSON.stringify({ type: "planning" }),
      }),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
    });
    authenticateAs(repo);

    const response = await completeSessionByRoomKeyController(
      makeRequest("https://test.com/sessions/complete", {
        method: "POST",
        headers: { Cookie: "room_session=room-token" },
        body: JSON.stringify({ roomKey: "ROOM-1" }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(repo.completeLatestSessionByRoomKey).toHaveBeenCalledWith(
      "ROOM-1",
      1,
      1,
      true,
    );
  });

  it("records a wheel outcome as a workspace action", async () => {
    const repo = createRepo({
      getAccessibleTeamSessionByRoomKey: vi.fn().mockResolvedValue({
        id: 21,
        teamId: 10,
        roomKey: "WHEEL-1",
        name: "Review picker",
        metadata: JSON.stringify({ type: "wheel", existing: true }),
      }),
      getTeamSessionById: vi.fn().mockResolvedValue({
        id: 21,
        teamId: 10,
        roomKey: "WHEEL-1",
        name: "Review picker",
      }),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
    });
    authenticateAs(repo);

    const response = await recordWheelOutcomeByRoomKeyController(
      makeRequest("https://test.com/sessions/wheel-outcomes", {
        method: "POST",
        headers: { Cookie: "wheel_session=wheel-token" },
        body: JSON.stringify({
          roomKey: "WHEEL-1",
          mode: "reviewer",
          result: {
            id: "spin-1",
            winner: "Ava",
            timestamp: 1_700_000_000_000,
            removedAfter: false,
          },
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(repo.upsertWorkspaceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 10,
        processLoopId: null,
        sourceSessionId: 21,
        source: "wheel",
        sourceRef: "wheel-outcome-21-reviewer",
        title: "Reviewer: Ava",
      }),
    );
    expect(repo.updateTeamSessionMetadata).not.toHaveBeenCalled();
  });

  it("records complete planning follow-ups as workspace actions", async () => {
    const repo = createRepo({
      getAccessibleTeamSessionByRoomKey: vi.fn().mockResolvedValue({
        id: 23,
        teamId: 10,
        roomKey: "ROOM-1",
        name: "Sprint planning",
        metadata: JSON.stringify({ type: "planning" }),
      }),
      getProcessLoopForSession: vi.fn().mockResolvedValue({ id: 12 }),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
    });
    authenticateAs(repo);

    const response = await recordPlanningActionsByRoomKeyController(
      makeRequest("https://test.com/sessions/planning-actions", {
        method: "POST",
        headers: { Cookie: "room_session=room-token" },
        body: JSON.stringify({
          roomKey: "ROOM-1",
          followUps: [
            {
              title: "Clarify unknowns",
              detail: "Check acceptance criteria",
              ticketKey: "FOLLOW-1",
            },
          ],
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(repo.upsertWorkspaceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 10,
        processLoopId: 12,
        sourceSessionId: 23,
        source: "planning",
        sourceRef: "planning-follow-up-23-clarify-unknowns-follow-1",
        title: "Clarify unknowns",
      }),
    );
  });

  it("records standup blockers as workspace actions", async () => {
    const repo = createRepo({
      getAccessibleTeamSessionByRoomKey: vi.fn().mockResolvedValue({
        id: 22,
        teamId: 10,
        roomKey: "STAND-1",
        name: "Standup",
        metadata: JSON.stringify({ type: "standup" }),
      }),
      getTeamMembership: vi
        .fn()
        .mockResolvedValue({ role: "member", status: "active" }),
    });
    authenticateAs(repo);

    const response = await recordStandupActionsByRoomKeyController(
      makeRequest("https://test.com/sessions/standup-actions", {
        method: "POST",
        headers: { Cookie: "standup_session=standup-token" },
        body: JSON.stringify({
          roomKey: "STAND-1",
          blockers: [
            {
              userName: "Ava",
              description: "Waiting on review",
              linkedTickets: [
                {
                  id: "1",
                  key: "SJ-2",
                  title: "Review",
                  provider: "github",
                },
              ],
            },
          ],
          nextSteps: [
            {
              userName: "Ben",
              description: "Finish workspace UI",
            },
          ],
        }),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(repo.upsertWorkspaceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 10,
        sourceSessionId: 22,
        source: "standup",
        sourceRef: "standup-blocker:ava",
        title: "Resolve blocker for Ava",
        priority: "high",
      }),
    );
    expect(repo.upsertWorkspaceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 10,
        sourceSessionId: 22,
        source: "standup",
        sourceRef: "standup-next-step:ben",
        title: "Next step for Ben",
        detail: "Finish workspace UI",
        priority: "normal",
      }),
    );
  });

  it("rejects wheel outcomes for unsupported modes", async () => {
    const repo = createRepo();
    authenticateAs(repo);

    const response = await recordWheelOutcomeByRoomKeyController(
      makeRequest("https://test.com/sessions/wheel-outcomes", {
        method: "POST",
        body: JSON.stringify({
          roomKey: "WHEEL-1",
          mode: "pair_picker",
          result: {
            id: "spin-1",
            winner: "Ava",
            timestamp: 1_700_000_000_000,
            removedAfter: false,
          },
        }),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(repo.updateTeamSessionMetadata).not.toHaveBeenCalled();
  });

  it("returns workspace stats using the caller scope", async () => {
    const repo = createRepo();
    authenticateAs(repo);

    const response = await getWorkspaceStatsController(
      makeRequest("https://test.com/workspace/stats"),
      env,
    );
    const data = (await response.json()) as { totalTeams: number };

    expect(response.status).toBe(200);
    expect(data.totalTeams).toBe(3);
    expect(repo.getWorkspaceStats).toHaveBeenCalledWith(1, 1, true);
  });

  it("returns workspace profile data without overloading auth bootstrap", async () => {
    const repo = createRepo({
      getOrganisationMembers: vi.fn().mockResolvedValue([
        {
          id: 1,
          email: "admin@example.com",
          name: "Admin User",
          avatar: null,
          createdAt: 1700000000000,
          lastLoginAt: 1700000001000,
          role: "admin",
          status: "active",
          approvedAt: 1700000000000,
        },
      ]),
      listPendingWorkspaceInvites: vi
        .fn()
        .mockResolvedValue([makeInvite({ email: "pending@example.com" })]),
    });
    authenticateAs(repo);

    const response = await getWorkspaceProfileController(
      makeRequest("https://test.com/workspace/profile"),
      env,
    );
    const data = (await response.json()) as {
      membership: { role: string };
      organisation: { name: string };
      members: Array<{ email: string }>;
      invites: Array<{ email: string }>;
    };

    expect(response.status).toBe(200);
    expect(data.membership.role).toBe("admin");
    expect(data.organisation.name).toBe("Example");
    expect(data.members).toEqual([
      expect.objectContaining({ email: "admin@example.com" }),
    ]);
    expect(data.invites).toEqual([
      expect.objectContaining({ email: "pending@example.com" }),
    ]);
  });

  it("only allows workspace admins to update workspace settings", async () => {
    const repo = createRepo({
      isOrganisationAdmin: vi.fn().mockResolvedValue(false),
      getOrganisationMembership: vi
        .fn()
        .mockResolvedValue(makeMembership({ role: "member" })),
    });
    authenticateAs(repo);

    const response = await updateWorkspaceProfileController(
      makeRequest("https://test.com/workspace/profile", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Workspace" }),
      }),
      env,
    );
    const data = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "Only workspace admins can update workspace profile",
    );
  });

  it("updates workspace profile including manual approval", async () => {
    const repo = createRepo({
      getOrganisationById: vi
        .fn()
        .mockResolvedValue(makeOrganisation({ requireMemberApproval: true })),
    });
    authenticateAs(repo);

    const response = await updateWorkspaceProfileController(
      makeRequest("https://test.com/workspace/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: "Updated Workspace",
          requireMemberApproval: true,
        }),
      }),
      env,
    );
    const data = (await response.json()) as {
      organisation: { requireMemberApproval: boolean };
    };

    expect(response.status).toBe(200);
    expect(data.organisation.requireMemberApproval).toBe(true);
    expect(repo.updateOrganisation).toHaveBeenCalledWith(1, {
      name: "Updated Workspace",
      requireMemberApproval: true,
    });
  });

  it("creates workspace invites for admins", async () => {
    const repo = createRepo({
      getOrganisationById: vi
        .fn()
        .mockResolvedValue(makeOrganisation({ name: "Acme Workspace" })),
    });
    authenticateAs(repo);

    const response = await inviteWorkspaceMemberController(
      makeRequest("https://test.com/workspace/invites", {
        method: "POST",
        body: JSON.stringify({ email: "invitee@external.com" }),
      }),
      env,
    );
    const data = (await response.json()) as { invite: { email: string } };

    expect(response.status).toBe(201);
    expect(data.invite.email).toBe("invitee@external.com");
    expect(repo.createOrUpdateWorkspaceInvite).toHaveBeenCalledWith(
      1,
      "invitee@external.com",
      1,
    );
    expect(services.sendWorkspaceInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "invitee@external.com",
        workspaceName: "Acme Workspace",
      }),
    );
  });
});
