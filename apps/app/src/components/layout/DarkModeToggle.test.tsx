// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DarkModeToggle } from "@/components/layout/DarkModeToggle";
import { ThemeProvider } from "@/lib/theme-context";

describe("DarkModeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  it("toggles the active theme from the footer control", async () => {
    render(
      <ThemeProvider>
        <footer>
          <DarkModeToggle />
        </footer>
      </ThemeProvider>,
    );

    const toggle = await screen.findByRole("button", {
      name: "Switch to dark mode",
    });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeTruthy();
  });
});
