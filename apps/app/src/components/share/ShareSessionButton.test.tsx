// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ShareSessionButton } from "@/components/share/ShareSessionButton";

describe("ShareSessionButton", () => {
  it("renders the session key and opens the share flow", () => {
    const onShare = vi.fn();

    render(
      <ShareSessionButton
        sessionKey="ABC123"
        keyTestId="room-key-value"
        shareLabel="Share room"
        onShare={onShare}
      >
        <span>Active</span>
      </ShareSessionButton>,
    );

    expect(screen.getByTestId("room-key-value").textContent).toBe("ABC123");
    expect(screen.getByText("Active")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Share room" }));

    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
