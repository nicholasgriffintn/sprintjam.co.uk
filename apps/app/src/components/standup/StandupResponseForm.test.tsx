// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StandupResponse } from "@sprintjam/types";

import { StandupResponseForm } from "@/components/standup/StandupResponseForm";

vi.mock("@/lib/icebreaker-questions", () => ({
  getIcebreakerQuestion: vi.fn(() => "Which tiny tool saved you time lately?"),
}));

describe("StandupResponseForm", () => {
  it("submits a fresh response payload", () => {
    const onSubmit = vi.fn();

    render(
      <StandupResponseForm
        status="active"
        isModeratorView={false}
        isSocketConnected
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /not attending the meeting/i }),
    );
    fireEvent.change(screen.getByLabelText("Yesterday"), {
      target: { value: "Wrapped the worker routes" },
    });
    fireEvent.change(screen.getByLabelText("Today"), {
      target: { value: "Build the standup UI" },
    });
    fireEvent.click(screen.getByRole("button", { name: /strong/i }));
    fireEvent.click(screen.getByRole("button", { name: /i have blockers/i }));
    fireEvent.change(
      screen.getByPlaceholderText(
        /what is blocked and what help do you need\?/i,
      ),
      {
        target: { value: "Waiting on product copy" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save update" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        isInPerson: false,
        yesterday: "Wrapped the worker routes",
        today: "Build the standup UI",
        hasBlocker: true,
        blockerDescription: "Waiting on product copy",
        healthCheck: 4,
        linkedTickets: undefined,
      }),
    );
  });

  it("allows an existing response to be edited and resubmitted", () => {
    const onSubmit = vi.fn();
    const response: StandupResponse = {
      userName: "Alice",
      isInPerson: false,
      yesterday: "Shipped the worker",
      today: "Wire the room screen",
      hasBlocker: false,
      healthCheck: 3,
      submittedAt: Date.now() - 1_000,
      updatedAt: Date.now(),
    };

    render(
      <StandupResponseForm
        response={response}
        status="active"
        isModeratorView={false}
        isSocketConnected
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit update" }));
    fireEvent.change(screen.getByLabelText("Today"), {
      target: { value: "Wire the full room screen" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        isInPerson: false,
        yesterday: "Shipped the worker",
        today: "Wire the full room screen",
        hasBlocker: false,
        blockerDescription: undefined,
        healthCheck: 3,
        linkedTickets: undefined,
      }),
    );
  });

  it("stores the same icebreaker question shown to the participant", () => {
    const onSubmit = vi.fn();

    render(
      <StandupResponseForm
        status="active"
        isModeratorView={false}
        isSocketConnected
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByText("Which tiny tool saved you time lately?"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /no blockers/i }));
    fireEvent.change(screen.getByPlaceholderText("Your answer..."), {
      target: { value: "A clipboard manager" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save update" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        icebreakerAnswer: "A clipboard manager",
        icebreakerQuestion: "Which tiny tool saved you time lately?",
      }),
    );
  });

  it("treats completed standups as read-only history", () => {
    const onSubmit = vi.fn();
    const response: StandupResponse = {
      userName: "Alice",
      yesterday: "Shipped the worker",
      today: "Wire the room screen",
      hasBlocker: false,
      healthCheck: 3,
      submittedAt: Date.now() - 1_000,
      updatedAt: Date.now(),
    };

    render(
      <StandupResponseForm
        response={response}
        status="completed"
        isModeratorView
        isSocketConnected
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByText(
        "This standup is complete. Responses are now read-only history.",
      ),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Edit update" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
