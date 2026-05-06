/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { WorkspaceTeam } from "@sprintjam/types";

import { TeamsList } from "@/components/workspace/TeamsList";

const team: WorkspaceTeam = {
  id: 10,
  slug: "amber-cobalt-ripple",
  name: "Platform",
  logoUrl: null,
  organisationId: 1,
  ownerId: 2,
  accessPolicy: "open",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  currentUserRole: "admin",
  currentUserStatus: "active",
  canAccess: true,
  canManage: true,
};

describe("TeamsList", () => {
  it("opens team pages in a new tab", () => {
    const onOpenTeam = vi.fn();

    render(
      <TeamsList
        teams={[team]}
        getTeamPageHref={(workspaceTeam) =>
          `/workspace/teams/${workspaceTeam.slug}`
        }
        onOpenTeam={onOpenTeam}
        onEditTeam={vi.fn()}
      />,
    );

    const openPageLink = screen.getByRole("link", { name: "Open page" });

    expect(openPageLink.getAttribute("href")).toBe(
      "/workspace/teams/amber-cobalt-ripple",
    );
    expect(openPageLink.getAttribute("target")).toBe("_blank");
    expect(openPageLink.getAttribute("rel")).toBe("noopener noreferrer");

    fireEvent.click(openPageLink);

    expect(onOpenTeam).toHaveBeenCalledWith(team);
  });
});
