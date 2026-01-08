import { describe, it, expect, beforeEach, vi } from "vitest";
import { parsePath, getPathFromScreen, navigateTo } from "./navigation";

describe("navigation", () => {
  describe("parsePath", () => {
    it("returns welcome for root path", () => {
      expect(parsePath("/")).toEqual({ screen: "welcome" });
    });

    it("returns welcome for empty path", () => {
      expect(parsePath("")).toEqual({ screen: "welcome" });
    });

    it("parses auth login path", () => {
      expect(parsePath("/auth/login")).toEqual({ screen: "login" });
    });

    it("parses workspace path", () => {
      expect(parsePath("/workspace")).toEqual({ screen: "workspace" });
    });

    it("parses create path", () => {
      expect(parsePath("/create")).toEqual({ screen: "create" });
    });

    it("parses join path", () => {
      expect(parsePath("/join")).toEqual({ screen: "join" });
    });

    it("parses room path without key", () => {
      expect(parsePath("/room")).toEqual({ screen: "room" });
    });

    it("parses room path with key", () => {
      expect(parsePath("/room/ABC123")).toEqual({
        screen: "room",
        roomKey: "ABC123",
      });
    });

    it("uppercases room key", () => {
      expect(parsePath("/room/abc123")).toEqual({
        screen: "room",
        roomKey: "ABC123",
      });
    });

    it("parses privacy path", () => {
      expect(parsePath("/privacy")).toEqual({ screen: "privacy" });
    });

    it("parses terms path", () => {
      expect(parsePath("/terms")).toEqual({ screen: "terms" });
    });

    it("parses changelog path", () => {
      expect(parsePath("/changelog")).toEqual({ screen: "changelog" });
    });

    it("returns 404 for unknown path", () => {
      expect(parsePath("/unknown")).toEqual({ screen: "404" });
    });

    it("handles trailing slashes", () => {
      expect(parsePath("/workspace/")).toEqual({ screen: "workspace" });
    });

    it("handles query strings", () => {
      expect(parsePath("/workspace?foo=bar")).toEqual({ screen: "workspace" });
    });

    it("handles room path with trailing slash", () => {
      expect(parsePath("/room/ABC123/")).toEqual({
        screen: "room",
        roomKey: "ABC123",
      });
    });
  });

  describe("getPathFromScreen", () => {
    it("returns / for welcome", () => {
      expect(getPathFromScreen("welcome")).toBe("/");
    });

    it("returns /auth/login for login", () => {
      expect(getPathFromScreen("login")).toBe("/auth/login");
    });

    it("returns /workspace for workspace", () => {
      expect(getPathFromScreen("workspace")).toBe("/workspace");
    });

    it("returns /create for create", () => {
      expect(getPathFromScreen("create")).toBe("/create");
    });

    it("returns /join for join", () => {
      expect(getPathFromScreen("join")).toBe("/join");
    });

    it("returns /room for room without key", () => {
      expect(getPathFromScreen("room")).toBe("/room");
    });

    it("returns /room/KEY for room with key", () => {
      expect(getPathFromScreen("room", "ABC123")).toBe("/room/ABC123");
    });

    it("returns /privacy for privacy", () => {
      expect(getPathFromScreen("privacy")).toBe("/privacy");
    });

    it("returns /terms for terms", () => {
      expect(getPathFromScreen("terms")).toBe("/terms");
    });

    it("returns /changelog for changelog", () => {
      expect(getPathFromScreen("changelog")).toBe("/changelog");
    });

    it("returns /404 for 404", () => {
      expect(getPathFromScreen("404")).toBe("/404");
    });
  });

  describe("navigateTo", () => {
    beforeEach(() => {
      vi.stubGlobal("window", {
        location: { pathname: "/" },
        history: { pushState: vi.fn() },
      });
    });

    it("pushes state when path changes", () => {
      navigateTo("workspace");
      expect(window.history.pushState).toHaveBeenCalledWith(
        { screen: "workspace", roomKey: undefined },
        "",
        "/workspace",
      );
    });

    it("pushes state with room key", () => {
      navigateTo("room", "ABC123");
      expect(window.history.pushState).toHaveBeenCalledWith(
        { screen: "room", roomKey: "ABC123" },
        "",
        "/room/ABC123",
      );
    });

    it("does not push state when path is same", () => {
      window.location.pathname = "/workspace";
      navigateTo("workspace");
      expect(window.history.pushState).not.toHaveBeenCalled();
    });
  });
});
