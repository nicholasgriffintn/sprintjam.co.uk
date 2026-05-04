// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AppToastProvider, toast, useToast } from "@/components/ui";

const createdToastIds = new Set<string>();

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  for (const id of createdToastIds) {
    act(() => {
      toast.close(id);
    });
  }
  createdToastIds.clear();
  cleanup();
});

function HookTrigger() {
  const toastManager = useToast();

  return (
    <button
      type="button"
      onClick={() => {
        const id = toastManager.add({
          actionProps: {
            children: "Undo",
            onClick: vi.fn(),
          },
          description: "Default settings were updated for this team.",
          title: "Saved",
          type: "success",
        });

        createdToastIds.add(id);
      }}
    >
      Trigger toast
    </button>
  );
}

describe("AppToastProvider", () => {
  it("renders toasts created from the provider hook", async () => {
    render(
      <AppToastProvider>
        <HookTrigger />
      </AppToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger toast" }));

    expect(await screen.findByText("Saved")).toBeTruthy();
    expect(
      screen.getByText("Default settings were updated for this team."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
  });

  it("renders toasts created from the shared toast helper", async () => {
    render(
      <AppToastProvider>
        <div>Toast host</div>
      </AppToastProvider>,
    );

    let toastId = "";

    act(() => {
      toastId = toast.error({
        description: "Couldn't update passcode",
        title: "Update failed",
      });
    });
    createdToastIds.add(toastId);

    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(screen.getAllByText("Update failed")[0]).toBeTruthy();
    expect(screen.getAllByText("Couldn't update passcode")[0]).toBeTruthy();
  });
});
