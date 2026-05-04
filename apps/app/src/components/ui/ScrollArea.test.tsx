// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ScrollArea } from "@/components/ui/ScrollArea";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("ScrollArea", () => {
  it("renders a focusable viewport by default", () => {
    render(<ScrollArea aria-label="Scrollable content">Content</ScrollArea>);

    expect(
      screen.getByLabelText("Scrollable content").getAttribute("tabindex"),
    ).toBe("0");
    expect(screen.getByText("Content")).toBeTruthy();
  });

  it("can render a non-focusable viewport", () => {
    render(
      <ScrollArea aria-label="Passive scroll area" focusable={false}>
        Content
      </ScrollArea>,
    );

    expect(
      screen.getByLabelText("Passive scroll area").getAttribute("tabindex"),
    ).toBeNull();
  });
});
