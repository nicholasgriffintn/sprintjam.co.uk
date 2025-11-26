declare const WebSocketPair: {
  new(): { 0: CfWebSocket; 1: CfWebSocket };
};

import type {
  DurableObjectState,
  WebSocket as CfWebSocket,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env } from "../types";
import { createJsonResponse, jsonError } from "../utils/http";
import {
  FixitLeaderboardRepository,
  type LeaderboardEntry,
} from "../repositories/fixit-leaderboard";
import { FixitEventsRepository } from "../repositories/fixit-events";

interface LeaderboardCacheEntry {
  data: LeaderboardEntry[];
  timestamp: number;
}

interface EventsCacheEntry {
  data: Awaited<
    ReturnType<FixitEventsRepository["listRecentEvents"]>
  >;
  timestamp: number;
}

const CACHE_TTL_MS = 10_000;

export class FixitRoom {
  state: DurableObjectState;
  env: Env;
  sessions: Map<CfWebSocket, { fixitId: string }>;
  leaderboardCache: Map<string, LeaderboardCacheEntry>;
  eventsCache: Map<string, EventsCacheEntry>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.leaderboardCache = new Map();
    this.eventsCache = new Map();
  }

  async fetch(request: Request): Promise<CfResponse> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(url);
    }

    if (url.pathname.endsWith("/leaderboard") && request.method === "GET") {
      const fixitId = url.searchParams.get("fixitId");
      if (!fixitId) {
        return jsonError("Missing fixitId query parameter", 400);
      }
      const leaderboard = await this.getOrFetchLeaderboard(fixitId);
      return createJsonResponse({ fixitId, entries: leaderboard });
    }

    if (url.pathname.endsWith("/refresh") && request.method === "POST") {
      const { fixitId } = (await request.json().catch(() => ({}))) as {
        fixitId?: string;
      };
      if (!fixitId) {
        return jsonError("Missing fixitId in payload", 400);
      }
      const leaderboard = await this.refreshLeaderboard(fixitId);
      const events = await this.refreshEvents(fixitId);
      this.broadcast(fixitId, {
        type: "leaderboardUpdated",
        fixitId,
        entries: leaderboard,
      });
      this.broadcast(fixitId, {
        type: "eventsUpdated",
        fixitId,
        events,
      });
      return createJsonResponse({ ok: true });
    }

    return jsonError("FixitRoom endpoint not found", 404);
  }

  private handleWebSocket(url: URL): CfResponse {
    const fixitId = url.searchParams.get("fixitId");
    if (!fixitId) {
      return jsonError("Missing fixitId query parameter", 400);
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.sessions.set(server, { fixitId });

    server.addEventListener("message", () => {
      // No-op for now; future features could handle subscriptions/pings.
    });

    server.addEventListener("close", () => {
      this.sessions.delete(server);
    });

    Promise.all([
      this.getOrFetchLeaderboard(fixitId),
      this.getOrFetchEvents(fixitId),
    ])
      .then(([leaderboard, events]) => {
        server.send(
          JSON.stringify({
            type: "leaderboardSnapshot",
            fixitId,
            entries: leaderboard,
          }),
        );
        server.send(
          JSON.stringify({
            type: "eventsSnapshot",
            fixitId,
            events,
          }),
        );
      })
      .catch((error) => {
        server.send(
          JSON.stringify({
            type: "error",
            message: "Unable to load Fixits data",
            details: (error as Error).message,
          }),
        );
      });

    return new Response(null, {
      status: 101,
      webSocket: client as unknown as WebSocket,
    }) as unknown as CfResponse;
  }

  private async getOrFetchLeaderboard(
    fixitId: string,
  ): Promise<LeaderboardEntry[]> {
    const cached = this.leaderboardCache.get(fixitId);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    return this.refreshLeaderboard(fixitId);
  }

  private async refreshLeaderboard(
    fixitId: string,
  ): Promise<LeaderboardEntry[]> {
    if (!this.env.FIXITS_DB) {
      throw new Error("Fixits database binding unavailable");
    }

    const repo = new FixitLeaderboardRepository(this.env.FIXITS_DB);
    const leaderboard = await repo.getLeaderboard(fixitId);
    this.leaderboardCache.set(fixitId, {
      data: leaderboard,
      timestamp: Date.now(),
    });
    return leaderboard;
  }

  private async getOrFetchEvents(fixitId: string) {
    const cached = this.eventsCache.get(fixitId);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    return this.refreshEvents(fixitId);
  }

  private async refreshEvents(
    fixitId: string,
  ) {
    if (!this.env.FIXITS_DB) {
      throw new Error("Fixits database binding unavailable");
    }
    const repo = new FixitEventsRepository(this.env.FIXITS_DB);
    const events = await repo.listRecentEvents(fixitId, 30);
    this.eventsCache.set(fixitId, {
      data: events,
      timestamp: Date.now(),
    });
    return events;
  }

  private broadcast(
    fixitId: string,
    message: Record<string, unknown>,
  ): void {
    const payload = JSON.stringify(message);
    for (const [socket, session] of this.sessions) {
      if (session.fixitId === fixitId) {
        try {
          socket.send(payload);
        } catch (error) {
          console.error("Failed to send Fixits broadcast", error);
          socket.close(1011, "Delivery failure");
          this.sessions.delete(socket);
        }
      }
    }
  }
}
