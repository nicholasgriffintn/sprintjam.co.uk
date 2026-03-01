// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

// jsdom does not implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

import { Select, type SelectOption } from "@/components/ui/Select";

const options: SelectOption[] = [
  { value: "alpha", label: "Alpha Board" },
  { value: "beta", label: "Beta Board" },
  { value: "gamma", label: "Gamma Board" },
];

describe("Select", () => {
  it("does not render search input when option count is below search threshold", () => {
    render(<Select data-testid="queue-board" options={options} searchable />);

    expect(screen.queryByTestId("queue-board-search")).toBeNull();
  });

  it("closes after selecting an option", () => {
    const onValueChange = vi.fn();

    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByTestId("queue-board"));
    fireEvent.click(screen.getByRole("option", { name: "Beta Board" }));

    expect(onValueChange).toHaveBeenCalledWith("beta");
    expect(screen.queryByTestId("queue-board-search")).toBeNull();
  });

  it("closes when clicking outside", () => {
    render(
      <div>
        <Select
          data-testid="queue-board"
          options={options}
          searchable
          searchMinOptions={0}
        />
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>,
    );

    fireEvent.click(screen.getByTestId("queue-board"));
    expect(screen.getByTestId("queue-board-search")).toBeTruthy();

    fireEvent.pointerDown(screen.getByTestId("outside"));

    expect(screen.queryByTestId("queue-board-search")).toBeNull();
  });

  it("closes when escape is pressed", () => {
    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
      />,
    );

    fireEvent.click(screen.getByTestId("queue-board"));
    fireEvent.keyDown(screen.getByTestId("queue-board-search"), {
      key: "Escape",
    });

    expect(screen.queryByTestId("queue-board-search")).toBeNull();
  });

  it("closes when Tab is pressed in search", () => {
    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
      />,
    );

    fireEvent.click(screen.getByTestId("queue-board"));
    expect(screen.getByTestId("queue-board-search")).toBeTruthy();

    fireEvent.keyDown(screen.getByTestId("queue-board-search"), { key: "Tab" });

    expect(screen.queryByTestId("queue-board-search")).toBeNull();
  });

  it("supports keyboard selection", () => {
    const onValueChange = vi.fn();

    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
        onValueChange={onValueChange}
      />,
    );

    const trigger = screen.getByTestId("queue-board");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const search = screen.getByTestId("queue-board-search");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalled();
    expect(screen.queryByTestId("queue-board-search")).toBeNull();
  });

  it("does not auto-highlight first option when placeholder is shown with no selection", () => {
    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
        placeholder="Select a board"
      />,
    );

    fireEvent.click(screen.getByTestId("queue-board"));

    const search = screen.getByTestId("queue-board-search");
    expect(search.getAttribute("aria-activedescendant")).toBeNull();
  });

  it("marks the currently selected option with aria-selected", () => {
    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
        value="beta"
      />,
    );

    fireEvent.click(screen.getByTestId("queue-board"));

    const betaOption = screen.getByRole("option", { name: /Beta Board/ });
    expect(betaOption.getAttribute("aria-selected")).toBe("true");

    const alphaOption = screen.getByRole("option", { name: /Alpha Board/ });
    expect(alphaOption.getAttribute("aria-selected")).toBe("false");
  });
});
