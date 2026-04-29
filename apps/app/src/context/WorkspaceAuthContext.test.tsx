/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { WorkspaceAuthProfile } from "@sprintjam/types";

import {
  useWorkspaceAuth,
  WorkspaceAuthProvider,
} from "./WorkspaceAuthContext";

const mocks = vi.hoisted(() => ({
  revalidate: vi.fn(),
  writeUpsert: vi.fn(),
  writeDelete: vi.fn(),
  refetch: vi.fn(),
  get: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("react-router", () => ({
  useRevalidator: () => ({ revalidate: mocks.revalidate }),
}));

vi.mock("@/utils/feature-flags", () => ({
  isWorkspacesEnabled: () => true,
}));

vi.mock("@/lib/workspace-service", () => ({
  logout: mocks.logout,
}));

vi.mock("@/lib/data/hooks", () => ({
  useWorkspaceProfile: () => null,
}));

vi.mock("@/lib/data/collections", () => ({
  WORKSPACE_PROFILE_DOCUMENT_KEY: "workspace-profile",
  workspaceProfileCollection: {
    get: mocks.get,
    utils: {
      writeUpsert: mocks.writeUpsert,
      writeDelete: mocks.writeDelete,
      refetch: mocks.refetch,
    },
  },
}));

function AuthProbe() {
  const { user, teams, isAuthenticated, refreshAuth } = useWorkspaceAuth();

  return (
    <div>
      <span data-testid="user-name">{user?.name ?? "none"}</span>
      <span data-testid="team-count">{teams.length}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <button type="button" onClick={() => void refreshAuth()}>
        refresh
      </button>
    </div>
  );
}

const initialProfile: WorkspaceAuthProfile = {
  user: {
    id: 1,
    email: "alex@example.com",
    name: "Alex",
    organisationId: 1,
    avatar: null,
  },
  membership: {
    role: "admin",
    status: "active",
  },
  teams: [
    {
      id: 10,
      name: "Platform",
      organisationId: 1,
      ownerId: 1,
      accessPolicy: "open",
      createdAt: 1,
      updatedAt: 1,
      currentUserRole: "admin",
      currentUserStatus: "active",
      canAccess: true,
      canManage: true,
    },
  ],
};

describe("WorkspaceAuthProvider", () => {
  beforeEach(() => {
    mocks.revalidate.mockReset();
    mocks.writeUpsert.mockReset();
    mocks.writeDelete.mockReset();
    mocks.refetch.mockReset();
    mocks.get.mockReset();
    mocks.logout.mockReset();
  });

  it("hydrates auth state from the root loader profile without client refetch", async () => {
    render(
      <WorkspaceAuthProvider initialProfile={initialProfile}>
        <AuthProbe />
      </WorkspaceAuthProvider>,
    );

    expect(screen.getByTestId("user-name").textContent).toBe("Alex");
    expect(screen.getByTestId("team-count").textContent).toBe("1");
    expect(screen.getByTestId("authenticated").textContent).toBe("true");

    await waitFor(() => {
      expect(mocks.writeUpsert).toHaveBeenCalledWith(initialProfile);
    });
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it("clears stale auth state when the root loader has no profile", async () => {
    mocks.get.mockReturnValue(initialProfile);

    render(
      <WorkspaceAuthProvider initialProfile={null}>
        <AuthProbe />
      </WorkspaceAuthProvider>,
    );

    await waitFor(() => {
      expect(mocks.writeDelete).toHaveBeenCalledWith("workspace-profile");
    });
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
});
