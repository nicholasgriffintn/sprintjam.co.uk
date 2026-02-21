import { describe, expect, it } from "vitest";

import type { TicketMetadata } from "@/types";
import {
  clampTicketDescription,
  isTicketEstimated,
  normalizeExternalTicket,
} from "./queue-import-utils";

describe("queue-import-utils", () => {
  it("clamps very long descriptions", () => {
    const longText = "a".repeat(12000);
    const clamped = clampTicketDescription(longText);
    expect(clamped?.length).toBe(10000);
  });

  it("normalises provider ticket metadata", () => {
    const ticket: TicketMetadata = {
      id: "123",
      identifier: "TEAM-1",
      title: "Queue item",
      body: "Details",
      html_url: "https://example.com",
      labels: ["points:5"],
    };

    expect(normalizeExternalTicket(ticket)).toEqual({
      id: "123",
      key: "TEAM-1",
      title: "Queue item",
      description: "Details",
      status: "Unknown",
      assignee: null,
      storyPoints: null,
      estimate: null,
      labels: ["points:5"],
      url: "https://example.com",
      metadata: ticket,
    });
  });

  it("detects ticket estimation by provider semantics", () => {
    const jiraTicket = {
      id: "1",
      key: "ABC-1",
      title: "Jira issue",
      storyPoints: 8,
      metadata: {},
    };
    const githubTicket = {
      id: "2",
      key: "repo#2",
      title: "GitHub issue",
      labels: ["points:3"],
      metadata: {},
    };

    expect(isTicketEstimated(jiraTicket, "jira")).toBe(true);
    expect(isTicketEstimated(jiraTicket, "linear")).toBe(true);
    expect(isTicketEstimated(githubTicket, "github")).toBe(true);
    expect(isTicketEstimated({ ...githubTicket, labels: [] }, "github")).toBe(
      false,
    );
  });
});
