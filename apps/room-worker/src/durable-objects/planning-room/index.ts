declare const WebSocketPair: {
  new (): { 0: CfWebSocket; 1: CfWebSocket };
};

import type {
  DurableObjectState,
  WebSocket as CfWebSocket,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import { PlanningPokerJudge } from '@sprintjam/utils';
import type {
  RoomWorkerEnv,
  RoomData,
  BroadcastMessage,
  SessionInfo,
  StructuredVote,
} from '@sprintjam/types';
import { TicketQueueItem } from '@sprintjam/db';
import { normalizeRoomData, TokenCipher } from '@sprintjam/utils';

import { PlanningRoomRepository } from '../../repositories/planning-room';
import {
  handleHttpRequest,
  type PlanningRoomHttpContext,
} from '../../controllers/room';
import { handleSession as handleSessionHandler } from './session';
import {
  handleVote as handleVoteHandler,
  handleShowVotes as handleShowVotesHandler,
  handleResetVotes as handleResetVotesHandler,
  calculateAndUpdateJudgeScore as calculateAndUpdateJudgeScoreHandler,
} from './voting';
import { handleUpdateSettings as handleUpdateSettingsHandler } from './settings';
import {
  autoGenerateStrudel as autoGenerateStrudelHandler,
  generateStrudelTrack as generateStrudelTrackHelper,
  handleGenerateStrudel as handleGenerateStrudelHandler,
  handleToggleStrudelPlayback as handleToggleStrudelPlaybackHandler,
} from './strudel';
import {
  handleAddTicket as handleAddTicketHandler,
  handleDeleteTicket as handleDeleteTicketHandler,
  handleNextTicket as handleNextTicketHandler,
  handleSelectTicket as handleSelectTicketHandler,
  handleUpdateTicket as handleUpdateTicketHandler,
} from './tickets';
import {
  handleConfigureTimer as handleConfigureTimerHandler,
  handlePauseTimer as handlePauseTimerHandler,
  handleResetTimer as handleResetTimerHandler,
  handleStartTimer as handleStartTimerHandler,
} from './timer';
import { readRoomData } from './room-helpers';

export class PlanningRoom implements PlanningRoomHttpContext {
  state: DurableObjectState;
  env: RoomWorkerEnv;
  sessions: Map<CfWebSocket, SessionInfo>;
  judge: PlanningPokerJudge;
  repository: PlanningRoomRepository;

  constructor(state: DurableObjectState, env: RoomWorkerEnv) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.judge = new PlanningPokerJudge();

    const tokenCipher = new TokenCipher(env.TOKEN_ENCRYPTION_SECRET);

    this.repository = new PlanningRoomRepository(
      this.state.storage,
      tokenCipher
    );

    this.state.blockConcurrencyWhile(async () => {
      await this.migrateSchema();
    });
  }

  private async migrateSchema() {
    await this.repository.initializeSchema();

    const roomData = await this.getRoomData();
    if (roomData) {
      const normalizedRoomData = normalizeRoomData(roomData);
      await this.putRoomData(normalizedRoomData);
    }
  }

  disconnectUserSessions(userName: string) {
    for (const [socket, session] of this.sessions.entries()) {
      if (session.userName.toLowerCase() === userName.trim().toLowerCase()) {
        socket.close(4004, 'Session superseded');
        this.sessions.delete(socket);
      }
    }
  }

  async fetch(request: Request): Promise<CfResponse> {
    const url = new URL(request.url);

    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const roomKey = url.searchParams.get('room');
      const userName = url.searchParams.get('name');
      const sessionToken = url.searchParams.get('token');

      if (!roomKey || !userName || !sessionToken) {
        return new Response('Missing room key, user name, or token', {
          status: 400,
        }) as unknown as CfResponse;
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server, roomKey, userName, sessionToken);

      return new Response(null, {
        status: 101,
        webSocket: client as any,
      }) as unknown as CfResponse;
    }

    const httpResponse = await handleHttpRequest(this, request);
    if (httpResponse) {
      return httpResponse;
    }

    return new Response(JSON.stringify({ error: 'Room Route Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as CfResponse;
  }

  async handleSession(
    webSocket: CfWebSocket,
    roomKey: string,
    userName: string,
    sessionToken: string
  ) {
    return handleSessionHandler(
      this,
      webSocket,
      roomKey,
      userName,
      sessionToken
    );
  }

  async handleVote(userName: string, vote: string | number | StructuredVote) {
    return handleVoteHandler(this, userName, vote);
  }

  async handleShowVotes(userName: string) {
    return handleShowVotesHandler(this, userName);
  }

  async handleResetVotes(userName: string) {
    return handleResetVotesHandler(this, userName);
  }

  async handleUpdateSettings(
    userName: string,
    settings: Partial<RoomData['settings']>
  ) {
    return handleUpdateSettingsHandler(this, userName, settings);
  }

  async calculateAndUpdateJudgeScore() {
    return calculateAndUpdateJudgeScoreHandler(this);
  }

  async handleGenerateStrudel(userName: string) {
    return handleGenerateStrudelHandler(this, userName);
  }

  async autoGenerateStrudel() {
    return autoGenerateStrudelHandler(this);
  }

  async generateStrudelTrack(
    roomData: RoomData,
    options?: { notifyOnError?: boolean; logPrefix?: string }
  ) {
    return generateStrudelTrackHelper(this, roomData, options);
  }

  async handleToggleStrudelPlayback(userName: string) {
    return handleToggleStrudelPlaybackHandler(this, userName);
  }

  async handleSelectTicket(userName: string, ticketId: number) {
    return handleSelectTicketHandler(this, userName, ticketId);
  }

  async handleNextTicket(userName: string) {
    return handleNextTicketHandler(this, userName);
  }

  async handleAddTicket(userName: string, ticket: Partial<TicketQueueItem>) {
    return handleAddTicketHandler(this, userName, ticket);
  }

  async handleUpdateTicket(
    userName: string,
    ticketId: number,
    updates: Partial<TicketQueueItem>
  ) {
    return handleUpdateTicketHandler(this, userName, ticketId, updates);
  }

  async handleDeleteTicket(userName: string, ticketId: number) {
    return handleDeleteTicketHandler(this, userName, ticketId);
  }

  async handleStartTimer(userName: string) {
    return handleStartTimerHandler(this, userName);
  }

  async handlePauseTimer(userName: string) {
    return handlePauseTimerHandler(this, userName);
  }

  async handleResetTimer(userName: string) {
    return handleResetTimerHandler(this, userName);
  }

  async handleConfigureTimer(
    userName: string,
    config: {
      targetDurationSeconds?: number;
      autoResetOnVotesReset?: boolean;
      resetCountdown?: boolean;
    }
  ) {
    return handleConfigureTimerHandler(this, userName, config);
  }

  async handleToggleSpectator(userName: string, isSpectator: boolean) {
    this.repository.setUserSpectatorMode(userName, isSpectator);

    if (isSpectator) {
      this.repository.deleteUserVote(userName);
    }

    const broadcastRoomData = await this.getRoomData();
    this.broadcast({
      type: 'spectatorStatusChanged',
      user: userName,
      isSpectator,
      users: broadcastRoomData?.users ?? [],
      spectators: broadcastRoomData?.spectators ?? [],
    });
  }

  broadcast(message: BroadcastMessage) {
    const json = JSON.stringify(message);
    this.sessions.forEach((session, socket) => {
      try {
        session.webSocket.send(json);
      } catch (_err) {
        this.sessions.delete(socket);
      }
    });
  }

  async getRoomData(): Promise<RoomData | undefined> {
    return readRoomData(this);
  }

  async putRoomData(roomData: RoomData): Promise<void> {
    await this.repository.replaceRoomData(roomData);
  }
}
