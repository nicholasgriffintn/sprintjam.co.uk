// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FidgetToyProvider, useFidgetToys } from "./FidgetToyContext";
import { FidgetToyShelf } from "./FidgetToyShelf";

function FidgetHarness() {
  const { openPicker } = useFidgetToys();

  return (
    <>
      <button type="button" onClick={openPicker}>
        Open fidget box
      </button>
      <FidgetToyShelf />
    </>
  );
}

describe("FidgetToyShelf", () => {
  it("renders every registered toy from the picker", () => {
    render(
      <FidgetToyProvider>
        <FidgetHarness />
      </FidgetToyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open fidget box" }));

    expect(screen.getByRole("button", { name: "Spinner" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pop pad" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Joystick" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Switch panel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slider maze" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mini abacus" })).toBeTruthy();
  });

  it("can mute sounds, add a new toy, and clear toys", () => {
    render(
      <FidgetToyProvider>
        <FidgetHarness />
      </FidgetToyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open fidget box" }));
    fireEvent.click(screen.getByRole("button", { name: "Mute fidget sounds" }));
    fireEvent.click(screen.getByRole("button", { name: "Switch panel" }));

    expect(
      screen.getByRole("button", { name: "Unmute fidget sounds" }),
    ).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Top switch" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear fidget toys" }));

    expect(screen.queryByRole("switch", { name: "Top switch" })).toBeNull();
  });
});
