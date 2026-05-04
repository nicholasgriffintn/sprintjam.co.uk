/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getServerDefaults } from "@sprintjam/utils";

import {
  ServerDefaultsProvider,
  useServerDefaults,
} from "./ServerDefaultsContext";
import type { ServerDefaults } from "@/types";

const mocks = vi.hoisted(() => ({
  state: "idle" as "idle" | "loading" | "submitting",
}));

vi.mock("react-router", () => ({
  useRevalidator: () => ({
    state: mocks.state,
  }),
}));

function DefaultsProbe() {
  const { serverDefaults, isLoadingDefaults } = useServerDefaults();

  return (
    <div>
      <span data-testid="sequence">
        {serverDefaults.roomSettings.votingSequenceId}
      </span>
      <span data-testid="loading">{String(isLoadingDefaults)}</span>
    </div>
  );
}

function getTestServerDefaults(): ServerDefaults {
  const defaults = getServerDefaults();
  return {
    ...defaults,
    votingCriteria: defaults.votingCriteria ?? [],
  };
}

describe("ServerDefaultsProvider", () => {
  beforeEach(() => {
    mocks.state = "idle";
  });

  it("exposes loader defaults through context", () => {
    const defaults = getTestServerDefaults();

    render(
      <ServerDefaultsProvider defaults={defaults}>
        <DefaultsProbe />
      </ServerDefaultsProvider>,
    );

    expect(screen.getByTestId("sequence").textContent).toBe(
      defaults.roomSettings.votingSequenceId,
    );
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("tracks route revalidation while defaults are refreshed by the loader", () => {
    const defaults = getTestServerDefaults();
    mocks.state = "loading";

    render(
      <ServerDefaultsProvider defaults={defaults}>
        <DefaultsProbe />
      </ServerDefaultsProvider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("true");
  });
});
