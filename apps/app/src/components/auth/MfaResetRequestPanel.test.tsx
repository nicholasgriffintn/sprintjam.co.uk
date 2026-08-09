/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MfaResetRequestPanel } from "./MfaResetRequestPanel";
import { requestMfaReset } from "@/lib/workspace-service";

vi.mock("@/lib/workspace-service", () => ({
  requestMfaReset: vi.fn(),
}));

describe("MfaResetRequestPanel", () => {
  it("submits the email-verified challenge token", async () => {
    vi.mocked(requestMfaReset).mockResolvedValue(undefined);
    const onRequested = vi.fn();

    render(
      <MfaResetRequestPanel
        challengeToken="verified-challenge"
        onCancel={vi.fn()}
        onRequested={onRequested}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ask workspace admin to reset" }),
    );

    await waitFor(() => {
      expect(requestMfaReset).toHaveBeenCalledWith("verified-challenge");
      expect(onRequested).toHaveBeenCalledOnce();
    });
  });

  it("keeps an actionable error visible when the request fails", async () => {
    vi.mocked(requestMfaReset).mockRejectedValue(
      new Error("Authentication challenge expired"),
    );

    render(
      <MfaResetRequestPanel
        challengeToken="expired-challenge"
        onCancel={vi.fn()}
        onRequested={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Ask workspace admin to reset" }),
    );

    expect(
      await screen.findByText("Authentication challenge expired"),
    ).toBeTruthy();
  });

  it("returns to the available verification methods", () => {
    const onCancel = vi.fn();

    render(
      <MfaResetRequestPanel
        challengeToken="verified-challenge"
        onCancel={onCancel}
        onRequested={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Back to verification methods" }),
    );

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
