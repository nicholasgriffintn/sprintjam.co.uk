declare const WebSocketPair: {
  new (): { 0: CfWebSocket; 1: CfWebSocket };
};

import type {
  DurableObjectState,
  WebSocket as CfWebSocket,
  Request as CfRequest,
} from "@cloudflare/workers-types";
import type {
  RetroClientMessage,
  RetroPhase,
  RetroSessionInfo,
  RetroSettings,
  RetroStateData,
  RetroWorkerEnv,
} from "@sprintjam/types";
import {
  createRetroSessionCookie,
  generateID,
  generateSessionToken,
  getRetroSessionToken,
  getRetroTemplate,
  hashPasscode,
  isAllowedOrigin,
  normaliseRetroSettings,
  SESSION_TOKEN_TTL_MS,
  verifyPasscode,
} from "@sprintjam/utils";

import { RetroRoomRepository } from "../repositories/retro-room";
import { toClientRetroData } from "../lib/client-retro";
import { canDeleteRetroCard, canSetRetroPhase } from "../lib/retro-permissions";
import {
  configureRetroTimer,
  ensureRetroTimerState,
  extendRetroTimer,
  pauseRetroTimer,
  resetRetroTimer,
  startRetroTimer,
} from "../lib/retro-timer";
import { jsonError, jsonResponse } from "../lib/response";
import { validateRetroMessagePayload } from "../lib/retro-validation";

export class RetroRoom {
  private readonly repository: RetroRoomRepository;
  private readonly sessions = new Map<CfWebSocket, RetroSessionInfo>();

  constructor(
    state: DurableObjectState,
    private readonly env: RetroWorkerEnv,
  ) {
    this.repository = new RetroRoomRepository(state.storage);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }

    if (url.pathname === "/initialize" && request.method === "POST") {
      return this.handleInitialize(request);
    }

    if (url.pathname === "/join" && request.method === "POST") {
      return this.handleJoin(request);
    }

    if (url.pathname === "/settings" && request.method === "GET") {
      return this.handleSettings(request);
    }

    if (url.pathname === "/session/validate-any" && request.method === "POST") {
      return this.handleValidateAnySession(request);
    }

    if (
      url.pathname === "/session/validate-moderator" &&
      request.method === "POST"
    ) {
      return this.handleValidateModeratorSession(request);
    }

    return jsonError("Retro Route Not found", 404);
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const origin = request.headers.get("Origin");
    const isDevelopment = this.env.ENVIRONMENT === "development";
    if (!isAllowedOrigin(origin, isDevelopment)) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);
    const retroKey = url.searchParams.get("retro");
    const userName = url.searchParams.get("name");
    const sessionToken = getRetroSessionToken(request as unknown as CfRequest);

    if (!retroKey || !userName || !sessionToken) {
      return new Response("Missing retro key, user name, or session", {
        status: 400,
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    await this.handleSession(server, retroKey, userName, sessionToken);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleInitialize(request: Request): Promise<Response> {
    const body = await request.json<{
      retroKey: string;
      moderator: string;
      passcode?: string;
      settings?: Partial<RetroSettings>;
      templateId?: string;
      avatar?: string;
      workspaceUserId?: number;
    }>();

    if (!body.retroKey || !body.moderator) {
      return jsonError("Retro key and moderator are required", 400);
    }

    const existingRetro = await this.repository.getRetroData();
    if (existingRetro) {
      return jsonError("Retro already exists", 409);
    }

    const settings = normaliseRetroSettings(undefined, {
      ...(body.settings ?? {}),
      templateId: body.templateId ?? body.settings?.templateId,
    });
    const template = getRetroTemplate(settings.templateId);
    const now = Date.now();
    const sessionToken = generateSessionToken();
    const retro: RetroStateData = {
      key: body.retroKey,
      moderator: body.moderator,
      users: [body.moderator],
      connectedUsers: { [body.moderator]: false },
      phase: "input",
      phaseStartedAt: now,
      status: "active",
      template,
      settings,
      cards: [],
      actionItems: [],
      readyUsers: [],
      timerState: {
        running: true,
        seconds: 0,
        lastUpdateTime: now,
        targetDurationSeconds: settings.timerMinutes * 60,
        roundAnchorSeconds: 0,
        autoResetOnVotesReset: false,
      },
      userAvatars: body.avatar ? { [body.moderator]: body.avatar } : undefined,
      createdAt: now,
      passcodeHash: body.passcode
        ? await hashPasscode(body.passcode)
        : undefined,
      sessionTokens: {
        [body.moderator]: { token: sessionToken, createdAt: Date.now() },
      },
      workspaceUserIds: body.workspaceUserId
        ? { [body.moderator]: body.workspaceUserId }
        : undefined,
    };

    await this.repository.replaceRetroData(retro);

    return this.buildSessionResponse(
      {
        success: true,
        retro: toClientRetroData(retro),
      },
      sessionToken,
    );
  }

  private async handleJoin(request: Request): Promise<Response> {
    const body = await request.json<{
      name?: string;
      passcode?: string;
      avatar?: string;
      workspaceUserId?: number;
    }>();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return jsonError("Name is required", 400);
    }

    const retro = await this.repository.getRetroData();
    if (!retro) {
      return jsonError("Retro not found", 404);
    }

    let canonicalName = body.workspaceUserId
      ? this.repository.findUserNameByWorkspaceId(retro, body.workspaceUserId)
      : undefined;

    if (!canonicalName) {
      if (retro.passcodeHash) {
        if (!body.passcode) {
          return this.passcodeError("Passcode is required");
        }
        const valid = await verifyPasscode(body.passcode, retro.passcodeHash);
        if (!valid) {
          return this.passcodeError("Invalid passcode");
        }
      }

      const existingUser = this.repository.findCanonicalUserNameInData(
        retro,
        name,
      );
      if (existingUser && retro.connectedUsers[existingUser]) {
        return jsonError("Name already connected", 409);
      }
      canonicalName = existingUser ?? name;
    }

    const sessionToken = generateSessionToken();
    const updated = await this.repository.updateRetroData((current) => {
      const hasUser = current.users.some(
        (user) => user.toLowerCase() === canonicalName!.toLowerCase(),
      );
      return {
        ...current,
        users: hasUser ? current.users : [...current.users, canonicalName!],
        connectedUsers: {
          ...current.connectedUsers,
          [canonicalName!]: false,
        },
        userAvatars: body.avatar
          ? { ...(current.userAvatars ?? {}), [canonicalName!]: body.avatar }
          : current.userAvatars,
        workspaceUserIds: body.workspaceUserId
          ? {
              ...(current.workspaceUserIds ?? {}),
              [canonicalName!]: body.workspaceUserId,
            }
          : current.workspaceUserIds,
        sessionTokens: {
          ...(current.sessionTokens ?? {}),
          [canonicalName!]: { token: sessionToken, createdAt: Date.now() },
        },
      };
    });

    if (!updated) {
      return jsonError("Retro not found", 404);
    }

    return this.buildSessionResponse(
      {
        success: true,
        retro: toClientRetroData(updated),
      },
      sessionToken,
    );
  }

  private async handleSettings(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const sessionToken = getRetroSessionToken(request as unknown as CfRequest);
    const retro = await this.repository.getRetroData();

    if (!retro) {
      return jsonError("Retro not found", 404);
    }

    const canonicalName = name
      ? this.repository.findCanonicalUserNameInData(retro, name)
      : undefined;
    const isModerator = Boolean(
      canonicalName && canonicalName === retro.moderator,
    );
    const hasSession = Boolean(
      canonicalName &&
      sessionToken &&
      (await this.repository.validateSessionToken(canonicalName, sessionToken)),
    );

    return jsonResponse({
      settings: retro.settings,
      moderator: retro.moderator,
      template: retro.template,
      isModerator: isModerator && hasSession,
      hasPasscode: Boolean(retro.passcodeHash),
    });
  }

  private async handleValidateAnySession(request: Request): Promise<Response> {
    const token = getRetroSessionToken(request as unknown as CfRequest);
    const retro = await this.repository.getRetroData();
    if (!token || !retro) {
      return jsonError("Retro session is required", 401);
    }

    const valid = await Promise.all(
      retro.users.map((user) =>
        this.repository.validateSessionToken(user, token),
      ),
    );
    return valid.some(Boolean)
      ? jsonResponse({ success: true })
      : jsonError("Invalid session", 401);
  }

  private async handleValidateModeratorSession(
    request: Request,
  ): Promise<Response> {
    const token = getRetroSessionToken(request as unknown as CfRequest);
    const retro = await this.repository.getRetroData();
    if (!token || !retro) {
      return jsonError("Retro session is required", 401);
    }

    const valid = await this.repository.validateSessionToken(
      retro.moderator,
      token,
    );
    return valid
      ? jsonResponse({ success: true })
      : jsonError("Moderator session is required", 403);
  }

  private async handleSession(
    webSocket: CfWebSocket,
    retroKey: string,
    userName: string,
    sessionToken: string,
  ): Promise<void> {
    const retro = await this.repository.getRetroData();
    const canonicalName = this.repository.findCanonicalUserNameInData(
      retro,
      userName,
    );
    const isValid =
      retro?.key === retroKey &&
      canonicalName &&
      (await this.repository.validateSessionToken(canonicalName, sessionToken));

    webSocket.accept();

    if (!isValid || !retro || !canonicalName) {
      webSocket.send(
        JSON.stringify({
          type: "error",
          error: "Invalid or expired session. Please rejoin the retro.",
        }),
      );
      webSocket.close(4003, "Invalid session token");
      return;
    }

    this.sessions.set(webSocket, {
      webSocket,
      retroKey,
      userName: canonicalName,
    });
    await this.repository.setUserConnection(canonicalName, true);
    const connectedRetro = await this.repository.updateRetroData((current) => {
      ensureRetroTimerState(current);
      return current;
    });

    this.broadcast({
      type: "userJoined",
      user: canonicalName,
      users: connectedRetro?.users ?? [],
      userAvatars: connectedRetro?.userAvatars,
    });
    webSocket.send(
      JSON.stringify({
        type: "initialize",
        retro: toClientRetroData(connectedRetro ?? retro),
      }),
    );

    webSocket.addEventListener("message", (event) => {
      void this.handleSocketMessage(webSocket, canonicalName, event.data);
    });

    webSocket.addEventListener("close", () => {
      void this.handleSocketClose(webSocket, canonicalName);
    });
  }

  private async handleSocketMessage(
    webSocket: CfWebSocket,
    userName: string,
    rawData: string | ArrayBuffer,
  ): Promise<void> {
    const raw =
      typeof rawData === "string" ? rawData : new TextDecoder().decode(rawData);
    const validation = validateRetroMessagePayload(raw);
    if (!validation.ok) {
      webSocket.send(
        JSON.stringify({ type: "error", error: validation.error }),
      );
      return;
    }

    if (validation.message.type === "ping") {
      webSocket.send(JSON.stringify({ type: "pong" }));
      return;
    }

    const updated = await this.applyMessage(userName, validation.message);
    if (updated) {
      this.broadcast({
        type: "retroUpdated",
        retro: toClientRetroData(updated),
      });
    }
  }

  private async applyMessage(
    userName: string,
    message: RetroClientMessage,
  ): Promise<RetroStateData | undefined> {
    const retro = await this.repository.getRetroData();
    if (!retro || retro.status === "completed") {
      return undefined;
    }

    const isModerator = retro.moderator === userName;
    if (this.requiresModerator(message, retro.settings) && !isModerator) {
      return undefined;
    }

    switch (message.type) {
      case "addCard":
        if (
          !retro.template.columns.some(
            (column) => column.id === message.columnId,
          )
        ) {
          return undefined;
        }
        return this.repository.updateRetroData((current) => ({
          ...current,
          cards: [
            ...current.cards,
            {
              id: generateID(),
              columnId: message.columnId,
              text: message.text,
              owner: userName,
              author: current.settings.anonymousCards ? "" : userName,
              createdAt: Date.now(),
              votes: [],
            },
          ],
        }));
      case "deleteCard":
        return this.repository.updateRetroData((current) => ({
          ...current,
          cards: current.cards.filter(
            (card) =>
              card.id !== message.cardId ||
              !canDeleteRetroCard({
                card,
                moderator: current.moderator,
                userName,
              }),
          ),
        }));
      case "voteCard":
        return this.repository.updateRetroData((current) => ({
          ...current,
          cards: current.cards.map((card) => {
            if (card.id !== message.cardId) {
              return card;
            }
            const hasVote = card.votes.includes(userName);
            const userVoteCount = current.cards.filter((item) =>
              item.votes.includes(userName),
            ).length;
            if (
              !hasVote &&
              userVoteCount >= current.settings.votesPerParticipant
            ) {
              return card;
            }
            return {
              ...card,
              votes: hasVote
                ? card.votes.filter((vote) => vote !== userName)
                : [...card.votes, userName],
            };
          }),
        }));
      case "setPhase":
        if (!canSetRetroPhase(message.phase)) {
          return undefined;
        }
        return this.setPhase(message.phase);
      case "setReady":
        return this.repository.updateRetroData((current) => ({
          ...current,
          readyUsers: message.ready
            ? [...new Set([...current.readyUsers, userName])]
            : current.readyUsers.filter((user) => user !== userName),
        }));
      case "addAction":
        return this.repository.updateRetroData((current) => ({
          ...current,
          actionItems: [
            ...current.actionItems,
            {
              id: generateID(),
              title: message.title,
              owner: message.owner,
              createdAt: Date.now(),
              completed: false,
            },
          ],
        }));
      case "toggleAction":
        return this.repository.updateRetroData((current) => ({
          ...current,
          actionItems: current.actionItems.map((action) =>
            action.id === message.actionId
              ? { ...action, completed: message.completed }
              : action,
          ),
        }));
      case "updateSettings":
        return this.repository.updateRetroData((current) => {
          const settings = normaliseRetroSettings(
            current.settings,
            message.settings,
          );
          const next = {
            ...current,
            settings,
            template: getRetroTemplate(settings.templateId),
          };
          const timerState = ensureRetroTimerState(next);
          timerState.targetDurationSeconds = settings.timerMinutes * 60;
          return {
            ...next,
            timerState,
          };
        });
      case "startTimer":
        return this.repository.updateRetroData((current) => {
          startRetroTimer(current, Date.now());
          return current;
        });
      case "pauseTimer":
        return this.repository.updateRetroData((current) => {
          pauseRetroTimer(current, Date.now());
          return current;
        });
      case "resetTimer":
        return this.repository.updateRetroData((current) => {
          resetRetroTimer(current, Date.now(), false);
          return current;
        });
      case "configureTimer":
        return this.repository.updateRetroData((current) => {
          configureRetroTimer(current, message.config, Date.now());
          return current;
        });
      case "extendTimer":
        return this.repository.updateRetroData((current) => {
          extendRetroTimer(current, message.seconds, Date.now());
          return current;
        });
      case "completeRetro":
        await this.recordStats(retro);
        return this.repository.updateRetroData((current) => {
          const now = Date.now();
          pauseRetroTimer(current, now);
          return {
            ...current,
            phase: "completed",
            phaseStartedAt: now,
            status: "completed",
            completedAt: now,
          };
        });
      case "ping":
        return undefined;
    }
  }

  private async setPhase(
    phase: RetroPhase,
  ): Promise<RetroStateData | undefined> {
    return this.repository.updateRetroData((current) => {
      const now = Date.now();
      return {
        ...current,
        phase,
        phaseStartedAt: now,
        timerState: resetRetroTimer(current, now, true),
      };
    });
  }

  private requiresModerator(
    message: RetroClientMessage,
    settings: RetroSettings,
  ): boolean {
    return (
      message.type === "updateSettings" ||
      message.type === "completeRetro" ||
      message.type === "startTimer" ||
      message.type === "pauseTimer" ||
      message.type === "resetTimer" ||
      message.type === "configureTimer" ||
      message.type === "extendTimer" ||
      (message.type === "setPhase" && !settings.allowParticipantPhaseControl)
    );
  }

  private async handleSocketClose(
    webSocket: CfWebSocket,
    userName: string,
  ): Promise<void> {
    this.sessions.delete(webSocket);
    const isUserStillConnected = Array.from(this.sessions.values()).some(
      (session) => session.userName === userName,
    );

    if (isUserStillConnected) {
      return;
    }

    await this.repository.setUserConnection(userName, false);
    const retro = await this.repository.getRetroData();
    if (retro) {
      this.broadcast({
        type: "userLeft",
        user: userName,
        users: retro.users,
      });
      this.broadcast({
        type: "retroUpdated",
        retro: toClientRetroData(retro),
      });
    }
  }

  private async recordStats(retro: RetroStateData): Promise<void> {
    if (!this.env.STATS_WORKER) {
      return;
    }

    const voteCount = retro.cards.reduce(
      (total, card) => total + card.votes.length,
      0,
    );

    try {
      await this.env.STATS_WORKER.fetch(
        "https://stats-worker/api/internal/stats/retro-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomKey: retro.key,
            templateId: retro.template.id,
            templateName: retro.template.name,
            totalParticipants: retro.users.length,
            cardCount: retro.cards.length,
            voteCount,
            actionCount: retro.actionItems.length,
            completedActionCount: retro.actionItems.filter(
              (action) => action.completed,
            ).length,
            durationMs: Date.now() - retro.createdAt,
          }),
        },
      );
    } catch (error) {
      console.warn("Retro completed without stats sync", { error });
    }
  }

  private broadcast(message: unknown): void {
    const json = JSON.stringify(message);
    for (const [socket, session] of this.sessions.entries()) {
      try {
        session.webSocket.send(json);
      } catch {
        this.sessions.delete(socket);
      }
    }
  }

  private buildSessionResponse(body: unknown, sessionToken: string): Response {
    const isSecure = this.env.ENVIRONMENT !== "development";
    const maxAgeSeconds = Math.floor(SESSION_TOKEN_TTL_MS / 1000);
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": createRetroSessionCookie(
          sessionToken,
          maxAgeSeconds,
          isSecure,
        ),
      },
    });
  }

  private passcodeError(message: string): Response {
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-Error-Kind": "passcode",
      },
    });
  }
}
