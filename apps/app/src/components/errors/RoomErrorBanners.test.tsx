// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RoomErrorBanners } from "@/components/errors/RoomErrorBanners";

vi.mock("@/components/ui", () => ({
  toast: {
    add: vi.fn(),
    update: vi.fn(),
    close: vi.fn(),
  },
}));

vi.mock("@/components/ui/ErrorBanner", () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="error-banner">{message}</div>
  ),
}));

vi.mock("@/components/ui/Spinner", () => ({
  Spinner: () => <svg data-testid="spinner" aria-label="Loading" />,
}));

const defaultProps = {
  connectionStatus: "connected" as const,
  connectionIssue: null,
  roomError: null,
  roomErrorKind: null,
  onRetryConnection: vi.fn(),
  onLeaveRoom: vi.fn(),
  onClearRoomError: vi.fn(),
  showDelay: 5000,
};

const { toast } = await import("@/components/ui");

describe("RoomErrorBanners", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
    cleanup();
    vi.clearAllMocks();
  });

  it("shows reconnect spinner immediately on connection issue", () => {
    render(
      <RoomErrorBanners
        {...defaultProps}
        connectionStatus="disconnected"
        connectionIssue={{ type: "disconnected", message: "Connection lost." }}
      />,
    );

    expect(screen.getByTestId("reconnect-spinner")).toBeDefined();
  });

  it("does not show toast before showDelay elapses", () => {
    render(
      <RoomErrorBanners
        {...defaultProps}
        connectionStatus="disconnected"
        connectionIssue={{ type: "disconnected", message: "Connection lost." }}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(toast.add).not.toHaveBeenCalled();
  });

  it("shows toast and hides spinner after showDelay elapses", () => {
    render(
      <RoomErrorBanners
        {...defaultProps}
        connectionStatus="disconnected"
        connectionIssue={{ type: "disconnected", message: "Connection lost." }}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning", id: "room-status" }),
    );
    expect(screen.queryByTestId("reconnect-spinner")).toBeNull();
  });

  it("hides spinner without showing toast when connection is restored before showDelay", () => {
    const { rerender } = render(
      <RoomErrorBanners
        {...defaultProps}
        connectionStatus="disconnected"
        connectionIssue={{ type: "disconnected", message: "Connection lost." }}
      />,
    );

    expect(screen.getByTestId("reconnect-spinner")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    rerender(
      <RoomErrorBanners
        {...defaultProps}
        connectionStatus="connected"
        connectionIssue={null}
      />,
    );

    expect(screen.queryByTestId("reconnect-spinner")).toBeNull();
    expect(toast.add).not.toHaveBeenCalled();
  });

  it("shows auth error toast immediately without spinner", () => {
    render(
      <RoomErrorBanners
        {...defaultProps}
        connectionIssue={{ type: "auth", message: "Session expired." }}
      />,
    );

    expect(screen.queryByTestId("reconnect-spinner")).toBeNull();
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", id: "room-status" }),
    );
  });

  it("does not show spinner when connected normally", () => {
    render(<RoomErrorBanners {...defaultProps} />);

    expect(screen.queryByTestId("reconnect-spinner")).toBeNull();
  });

  it("clears transient room errors after the dismiss delay", () => {
    render(
      <RoomErrorBanners
        {...defaultProps}
        roomError="Failed to generate music"
      />,
    );

    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(defaultProps.onClearRoomError).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(defaultProps.onClearRoomError).toHaveBeenCalledTimes(1);
  });

  it("keeps auth room errors visible until manual action", () => {
    render(
      <RoomErrorBanners
        {...defaultProps}
        roomError="Session expired."
        roomErrorKind="auth"
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(defaultProps.onClearRoomError).not.toHaveBeenCalled();
  });
});
