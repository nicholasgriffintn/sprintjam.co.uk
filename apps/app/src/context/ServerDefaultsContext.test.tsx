/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getServerDefaults } from "@sprintjam/utils";

import {
  ServerDefaultsProvider,
  useServerDefaults,
} from "./ServerDefaultsContext";
import type { ServerDefaults } from "@/types";

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

  it("does not report unrelated route revalidation as server-defaults loading", () => {
    const defaults = getTestServerDefaults();

    render(
      <ServerDefaultsProvider defaults={defaults}>
        <DefaultsProbe />
      </ServerDefaultsProvider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("false");
  });
});
