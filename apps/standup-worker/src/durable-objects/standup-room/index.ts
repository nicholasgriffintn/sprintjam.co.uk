declare const WebSocketPair: {
  new (): { 0: CfWebSocket; 1: CfWebSocket };
};

import type {
  DurableObjectState,
  WebSocket as CfWebSocket,
} from "@cloudflare/workers-types";

import type { StandupWorkerEnv, StandupData } from "@sprintjam/types";
import { getStandupSessionToken, isAllowedOrigin } from "@sprintjam/utils";
import type { Request as CfRequest } from "@cloudflare/workers-types";

import { StandupRoomRepository } from "../../repositories/standup-room";
import {
  handleHttpRequest,
  type StandupRoomHttpContext,
} from "../../controllers/standup";
import { handleSession as handleSessionHandler } from "./session";

export interface StandupSessionInfo {
  webSocket: CfWebSocket;
  standupKey: string;
  userName: string;
}

export class StandupRoom implements StandupRoomHttpContext {
  state: DurableObjectState;
  env: StandupWorkerEnv;
  sessions: Map<CfWebSocket, StandupSessionInfo>;
  repository: StandupRoomRepository;
  focusedUser: string | undefined;

  constructor(state: DurableObjectState, env: StandupWorkerEnv) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();

    this.repository = new StandupRoomRepository(this.state.storage);

    this.state.blockConcurrencyWhile(async () => {
      await this.repository.initializeSchema();
    });
  }

  disconnectUserSessions(userName: string) {
    for (const [socket, session] of this.sessions.entries()) {
      if (session.userName.toLowerCase() === userName.trim().toLowerCase()) {
        socket.close(4004, "Session superseded");
        this.sessions.delete(socket);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const origin = request.headers.get("Origin");
      const isDevelopment = this.env.ENVIRONMENT === "development";

      if (!isAllowedOrigin(origin, isDevelopment)) {
        return new Response("Forbidden", { status: 403 });
      }

      const standupKey = url.searchParams.get("standup");
      const userName = url.searchParams.get("name");
      const sessionToken = getStandupSessionToken(
        request as unknown as CfRequest,
      );

      if (!standupKey || !userName || !sessionToken) {
        return new Response("Missing standup key, user name, or session", {
          status: 400,
        });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server, standupKey, userName, sessionToken);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    const httpResponse = await handleHttpRequest(this, request);
    if (httpResponse) {
      return httpResponse;
    }

    return new Response(JSON.stringify({ error: "Standup Route Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  async handleSession(
    webSocket: CfWebSocket,
    standupKey: string,
    userName: string,
    sessionToken: string,
  ) {
    return handleSessionHandler(
      this,
      webSocket,
      standupKey,
      userName,
      sessionToken,
    );
  }

  broadcast(message: Record<string, unknown>) {
    const json = JSON.stringify(message);
    this.sessions.forEach((_, socket) => {
      try {
        socket.send(json);
      } catch (_err) {
        this.sessions.delete(socket);
      }
    });
  }

  sendToModerator(moderator: string, message: Record<string, unknown>) {
    const json = JSON.stringify(message);
    this.sessions.forEach((session, socket) => {
      if (session.userName === moderator) {
        try {
          socket.send(json);
        } catch (_err) {
          this.sessions.delete(socket);
        }
      }
    });
  }

  sendToUser(userName: string, message: Record<string, unknown>) {
    const json = JSON.stringify(message);
    this.sessions.forEach((session, socket) => {
      if (session.userName === userName) {
        try {
          socket.send(json);
        } catch (_err) {
          this.sessions.delete(socket);
        }
      }
    });
  }

  async getStandupData(): Promise<StandupData | undefined> {
    const data = await this.repository.getStandupData();
    if (data && this.focusedUser) {
      data.focusedUser = this.focusedUser;
    }
    return data;
  }
}
