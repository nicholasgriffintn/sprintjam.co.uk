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
  it("renders a native select when option count is below search threshold", () => {
    render(<Select data-testid="queue-board" options={options} searchable />);
    const el = screen.getByTestId("queue-board");
    expect(el.tagName.toLowerCase()).toBe("select");
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
    expect(screen.queryByRole("listbox")).toBeNull();
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
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.pointerDown(screen.getByTestId("outside"));

    expect(screen.queryByRole("listbox")).toBeNull();
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
    fireEvent.keyDown(screen.getByTestId("queue-board"), { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes when Tab is pressed", () => {
    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
      />,
    );

    fireEvent.click(screen.getByTestId("queue-board"));
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.keyDown(screen.getByTestId("queue-board"), { key: "Tab" });

    expect(screen.queryByRole("listbox")).toBeNull();
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

    const input = screen.getByTestId("queue-board");
    fireEvent.keyDown(input, { key: "ArrowDown" });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
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
