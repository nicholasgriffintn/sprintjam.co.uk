// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FidgetToyProvider, useFidgetToys } from "./FidgetToyContext";
import { FidgetToyShelf } from "./FidgetToyShelf";

vi.mock("@/lib/fidget-audio", () => ({
  playFidgetBeadSound: vi.fn(),
  playFidgetPopSound: vi.fn(),
  playFidgetSlideSound: vi.fn(),
  playFidgetSpinSound: vi.fn(),
  playFidgetStickSound: vi.fn(),
  playFidgetSwitchSound: vi.fn(),
}));

const setReducedMotionPreference = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const getRotateDegrees = (styleAttribute: string | null | undefined) => {
  const match = styleAttribute?.match(/rotate\((\d+)deg\)/);
  return match ? Number(match[1]) : null;
};

const setViewportSize = ({ width, height }: { width: number; height: number }) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
};

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
  beforeEach(() => {
    setReducedMotionPreference(false);
    setViewportSize({ width: 1024, height: 768 });
  });

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

  it("renders randomised spinner and maze toy surfaces", () => {
    render(
      <FidgetToyProvider>
        <FidgetHarness />
      </FidgetToyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open fidget box" }));
    fireEvent.click(screen.getByRole("button", { name: "Spinner" }));
    fireEvent.click(screen.getByRole("button", { name: "Slider maze" }));

    expect(
      screen.getByRole("button", { name: "Spin fidget spinner" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("slider", { name: "Slide the bead through the maze" }),
    ).toBeTruthy();
  });

  it("lets keyboard users move floating toy windows", () => {
    render(
      <FidgetToyProvider>
        <FidgetHarness />
      </FidgetToyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open fidget box" }));
    fireEvent.click(screen.getByRole("button", { name: "Spinner" }));

    const spinnerWindow = screen.getByRole("region", { name: "Spinner" });
    expect(spinnerWindow.style.left).toBe("28px");

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Move Spinner window" }),
      {
        key: "ArrowRight",
      },
    );

    expect(spinnerWindow.style.left).toBe("40px");
  });

  it("keeps draggable windows visible when the viewport is smaller than their bounds", () => {
    setViewportSize({ width: 240, height: 260 });

    render(
      <FidgetToyProvider>
        <FidgetHarness />
      </FidgetToyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open fidget box" }));

    const pickerWindow = screen.getByRole("region", { name: "Fidget box" });
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Move Fidget box window" }),
      {
        key: "ArrowRight",
      },
    );

    expect(pickerWindow.style.left).toBe("12px");
    expect(pickerWindow.style.top).toBe("72px");
  });

  it("uses a static spinner step for reduced-motion users", () => {
    setReducedMotionPreference(true);

    render(
      <FidgetToyProvider>
        <FidgetHarness />
      </FidgetToyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open fidget box" }));
    fireEvent.click(screen.getByRole("button", { name: "Spinner" }));

    const spinnerButton = screen.getByRole("button", {
      name: "Spin fidget spinner",
    });
    const spinnerBody = spinnerButton.querySelector("span");
    const initialRotate = getRotateDegrees(spinnerBody?.getAttribute("style"));

    fireEvent.click(spinnerButton);

    const nextRotate = getRotateDegrees(spinnerBody?.getAttribute("style"));
    expect(initialRotate).not.toBeNull();
    expect(nextRotate).toBe((initialRotate ?? 0) + 45);
  });
});
