/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WheelSidebar } from "./WheelSidebar";

const baseProps = {
  results: [],
  isModeratorView: true,
  onBulkAddEntries: vi.fn(),
  onClearEntries: vi.fn(),
  disabled: false,
};

describe("WheelSidebar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it("keeps the textarea draft stable while debounced updates are echoed back", () => {
    const { rerender } = render(
      <WheelSidebar
        {...baseProps}
        entries={[{ id: "entry-1", name: "Alice", enabled: true }]}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      "Enter names, one per line...",
    );

    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: "Alice\nBob" } });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(baseProps.onClearEntries).toHaveBeenCalledTimes(1);

    rerender(<WheelSidebar {...baseProps} entries={[]} />);

    expect((textarea as HTMLTextAreaElement).value).toBe("Alice\nBob");

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(baseProps.onBulkAddEntries).toHaveBeenCalledWith(["Alice", "Bob"]);

    rerender(
      <WheelSidebar
        {...baseProps}
        entries={[
          { id: "entry-2", name: "Alice", enabled: true },
          { id: "entry-3", name: "Bob", enabled: true },
        ]}
      />,
    );

    expect((textarea as HTMLTextAreaElement).value).toBe("Alice\nBob");
  });

  it("keeps the textarea focused through unrelated result updates", () => {
    const { rerender } = render(
      <WheelSidebar
        {...baseProps}
        entries={[{ id: "entry-1", name: "Alice", enabled: true }]}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      "Enter names, one per line...",
    );

    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: "Alice\nBob" } });

    rerender(
      <WheelSidebar
        {...baseProps}
        entries={[{ id: "entry-1", name: "Alice", enabled: true }]}
        results={[
          {
            id: "result-1",
            winner: "Alice",
            timestamp: Date.now(),
            removedAfter: false,
          },
        ]}
      />,
    );

    expect(screen.getByPlaceholderText("Enter names, one per line...")).toBe(
      textarea,
    );
    expect((textarea as HTMLTextAreaElement).value).toBe("Alice\nBob");
  });
});
