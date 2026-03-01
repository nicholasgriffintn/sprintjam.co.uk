// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

// jsdom does not implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});

import { Select, type SelectOption } from "@/components/ui/Select";

const options: SelectOption[] = [
  { value: "alpha", label: "Alpha Board" },
  { value: "beta", label: "Beta Board" },
  { value: "gamma", label: "Gamma Board" },
];

async function openSearchSelect() {
  const input = screen.getByTestId("queue-board");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  return screen.findByRole("listbox");
}

describe("Select", () => {
  it("renders a native select when option count is below search threshold", () => {
    render(<Select data-testid="queue-board" options={options} searchable />);
    const el = screen.getByTestId("queue-board");
    expect(el.tagName.toLowerCase()).toBe("select");
  });

  it("closes after selecting an option", async () => {
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

    await openSearchSelect();
    fireEvent.click(screen.getByRole("option", { name: "Beta Board" }));

    expect(onValueChange).toHaveBeenCalledWith("beta");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes when clicking outside", async () => {
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

    expect(await openSearchSelect()).toBeTruthy();

    fireEvent.pointerDown(screen.getByTestId("outside"));

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes when escape is pressed", async () => {
    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
      />,
    );

    await openSearchSelect();
    fireEvent.keyDown(screen.getByTestId("queue-board"), { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes when Tab is pressed", async () => {
    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
      />,
    );

    expect(await openSearchSelect()).toBeTruthy();

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

  it("marks the currently selected option with aria-selected", async () => {
    render(
      <Select
        data-testid="queue-board"
        options={options}
        searchable
        searchMinOptions={0}
        value="beta"
      />,
    );

    await openSearchSelect();

    const betaOption = screen.getByRole("option", { name: /Beta Board/ });
    expect(betaOption.getAttribute("aria-selected")).toBe("true");

    const alphaOption = screen.getByRole("option", { name: /Alpha Board/ });
    expect(alphaOption.getAttribute("aria-selected")).toBe("false");
  });
});
