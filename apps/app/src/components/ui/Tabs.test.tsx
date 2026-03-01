// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Tabs } from "@/components/ui/Tabs";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Tabs", () => {
  it("switches panels when a different tab is selected", () => {
    render(
      <Tabs.Root defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="history">History</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">Overview panel</Tabs.Panel>
        <Tabs.Panel value="history">History panel</Tabs.Panel>
      </Tabs.Root>,
    );

    expect(screen.getByText("Overview panel")).toBeTruthy();
    expect(screen.queryByText("History panel")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "History" }));

    expect(screen.queryByText("Overview panel")).toBeNull();
    expect(screen.getByText("History panel")).toBeTruthy();
  });

  it("emits value changes and keeps caller attributes on tabs", () => {
    const onValueChange = vi.fn();

    render(
      <Tabs.Root defaultValue="overview" onValueChange={onValueChange}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="history" data-testid="history-tab">
            History
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">Overview panel</Tabs.Panel>
        <Tabs.Panel value="history">History panel</Tabs.Panel>
      </Tabs.Root>,
    );

    fireEvent.click(screen.getByTestId("history-tab"));

    expect(onValueChange).toHaveBeenCalled();
    expect(screen.getByTestId("history-tab").getAttribute("data-active")).toBe(
      "",
    );
  });
});
