// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { THEME_STORAGE_KEY } from "@/constants";
import { ThemeProvider, useTheme } from "./theme-context";

function ThemeProbe() {
  const { theme } = useTheme();
  return <span data-testid="theme-probe">{theme}</span>;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("keeps the first render stable for hydration", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const html = renderToString(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(html).toContain(">light</span>");
  });

  it("restores the stored theme after hydration", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-probe").textContent).toBe("dark");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
