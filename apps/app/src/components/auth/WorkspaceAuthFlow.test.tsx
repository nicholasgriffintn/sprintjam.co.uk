/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceAuthFlow } from "./WorkspaceAuthFlow";

const auth = vi.hoisted(() => ({
  navigate: vi.fn(),
  returnToChallengeSelection: vi.fn(),
  state: {
    view: "challenge",
    submitting: false,
    error: null,
    status: null,
    challenge: {
      kind: "mfa_selection",
      continuationToken: "verified-challenge",
      parameters: {
        availableChallenges: ["webauthn"],
        mode: "verify",
      },
    },
  },
}));

vi.mock("@ngriffin_uk/auth-react", () => ({
  AuthFlow: () => (
    <div data-testid="auth-flow">
      <button type="button">Use passkey</button>
    </div>
  ),
  useAuth: () => auth,
}));

describe("WorkspaceAuthFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces the verification methods with the reset request view", () => {
    render(<WorkspaceAuthFlow />);

    expect(screen.getByTestId("auth-flow")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Ask workspace admin to reset" }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Lost access to every method?" }),
    );

    expect(screen.queryByTestId("auth-flow")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Lost access to every method?" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Ask workspace admin to reset" }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Back to verification methods" }),
    );

    expect(screen.getByTestId("auth-flow")).toBeTruthy();
  });
});
