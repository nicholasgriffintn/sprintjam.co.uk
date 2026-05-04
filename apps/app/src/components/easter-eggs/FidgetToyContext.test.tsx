// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  MAX_FIDGET_TOYS,
  type ToyKind,
  useFidgetToys,
  FidgetToyProvider,
} from "@/components/easter-eggs/FidgetToyContext";

function ContextProbe() {
  const {
    isPickerOpen,
    isSoundEnabled,
    toys,
    addToy,
    clearToys,
    openPicker,
    toggleSound,
    updateToyPosition,
  } = useFidgetToys();

  const toyKinds: ToyKind[] = [
    "spinner",
    "pop-pad",
    "joystick",
    "switch-panel",
    "slider-maze",
    "mini-abacus",
  ];

  return (
    <div>
      <span data-testid="picker-state">{isPickerOpen ? "open" : "closed"}</span>
      <span data-testid="sound-state">{isSoundEnabled ? "on" : "off"}</span>
      <span data-testid="toy-count">{toys.length}</span>
      <span data-testid="toy-kinds">
        {toys.map((toy) => toy.kind).join(",")}
      </span>
      <span data-testid="first-position">
        {toys[0] ? `${toys[0].position.x},${toys[0].position.y}` : "none"}
      </span>
      <button type="button" onClick={openPicker}>
        Open
      </button>
      <button type="button" onClick={toggleSound}>
        Toggle sound
      </button>
      <button type="button" onClick={() => clearToys()}>
        Clear
      </button>
      <button
        type="button"
        onClick={() => {
          toyKinds.forEach((kind) => addToy(kind));
        }}
      >
        Add toys
      </button>
      <button
        type="button"
        onClick={() => {
          if (toys[0]) {
            updateToyPosition(toys[0].id, { x: 123, y: 234 });
          }
        }}
      >
        Move first
      </button>
    </div>
  );
}

describe("FidgetToyProvider", () => {
  it("keeps only the latest toys and exposes session controls", () => {
    render(
      <FidgetToyProvider>
        <ContextProbe />
      </FidgetToyProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Open" }).click();
      screen.getByRole("button", { name: "Toggle sound" }).click();
      screen.getByRole("button", { name: "Add toys" }).click();
    });

    expect(screen.getByTestId("picker-state").textContent).toBe("open");
    expect(screen.getByTestId("sound-state").textContent).toBe("off");
    expect(screen.getByTestId("toy-count").textContent).toBe(
      String(MAX_FIDGET_TOYS),
    );
    expect(screen.getByTestId("toy-kinds").textContent).toBe(
      "spinner,pop-pad,joystick,switch-panel,slider-maze,mini-abacus",
    );

    act(() => {
      screen.getByRole("button", { name: "Move first" }).click();
    });

    expect(screen.getByTestId("first-position").textContent).toBe("123,234");

    act(() => {
      screen.getByRole("button", { name: "Clear" }).click();
    });

    expect(screen.getByTestId("toy-count").textContent).toBe("0");
  });
});
