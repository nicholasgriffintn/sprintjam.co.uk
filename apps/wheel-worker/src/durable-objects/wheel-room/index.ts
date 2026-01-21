declare const WebSocketPair: {
  new (): { 0: CfWebSocket; 1: CfWebSocket };
};

import type {
  DurableObjectState,
  WebSocket as CfWebSocket,
} from '@cloudflare/workers-types';

import type {
  WheelWorkerEnv,
  WheelData,
  WheelBroadcastMessage,
  WheelSessionInfo,
  WheelSettings,
} from '@sprintjam/types';
import { getWheelSessionToken, isAllowedOrigin } from '@sprintjam/utils';
import type { Request as CfRequest } from '@cloudflare/workers-types';

import { WheelRoomRepository } from '../../repositories/wheel-room';
import {
  handleHttpRequest,
  type WheelRoomHttpContext,
} from '../../controllers/wheel';
import { handleSession as handleSessionHandler } from './session';
import {
  handleAddEntry as handleAddEntryHandler,
  handleRemoveEntry as handleRemoveEntryHandler,
  handleUpdateEntry as handleUpdateEntryHandler,
  handleToggleEntry as handleToggleEntryHandler,
  handleClearEntries as handleClearEntriesHandler,
  handleBulkAddEntries as handleBulkAddEntriesHandler,
} from './entries';
import {
  handleSpin as handleSpinHandler,
  handleSpinComplete as handleSpinCompleteHandler,
  handleResetWheel as handleResetWheelHandler,
  handleUpdateSettings as handleUpdateSettingsHandler,
} from './spin';

export class WheelRoom implements WheelRoomHttpContext {
  state: DurableObjectState;
  env: WheelWorkerEnv;
  sessions: Map<CfWebSocket, WheelSessionInfo>;
  repository: WheelRoomRepository;

  constructor(state: DurableObjectState, env: WheelWorkerEnv) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();

    this.repository = new WheelRoomRepository(this.state.storage);

    this.state.blockConcurrencyWhile(async () => {
      await this.migrateSchema();
    });
  }

  private async migrateSchema() {
    await this.repository.initializeSchema();
  }

  disconnectUserSessions(userName: string) {
    for (const [socket, session] of this.sessions.entries()) {
      if (session.userName.toLowerCase() === userName.trim().toLowerCase()) {
        socket.close(4004, 'Session superseded');
        this.sessions.delete(socket);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const origin = request.headers.get('Origin');
      const isDevelopment = this.env.ENVIRONMENT === 'development';

      if (!isAllowedOrigin(origin, isDevelopment)) {
        return new Response('Forbidden', {
          status: 403,
        });
      }

      const wheelKey = url.searchParams.get('wheel');
      const userName = url.searchParams.get('name');
      const sessionToken = getWheelSessionToken(
        request as unknown as CfRequest,
      );

      if (!wheelKey || !userName || !sessionToken) {
        return new Response('Missing wheel key, user name, or session', {
          status: 400,
        });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server, wheelKey, userName, sessionToken);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    const httpResponse = await handleHttpRequest(this, request);
    if (httpResponse) {
      return httpResponse;
    }

    return new Response(JSON.stringify({ error: 'Wheel Route Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async alarm() {
    await handleSpinCompleteHandler(this);
  }

  async handleSession(
    webSocket: CfWebSocket,
    wheelKey: string,
    userName: string,
    sessionToken: string,
  ) {
    return handleSessionHandler(
      this,
      webSocket,
      wheelKey,
      userName,
      sessionToken,
    );
  }

  async handleAddEntry(userName: string, name: string) {
    return handleAddEntryHandler(this, userName, name);
  }

  async handleRemoveEntry(userName: string, entryId: string) {
    return handleRemoveEntryHandler(this, userName, entryId);
  }

  async handleUpdateEntry(userName: string, entryId: string, name: string) {
    return handleUpdateEntryHandler(this, userName, entryId, name);
  }

  async handleToggleEntry(userName: string, entryId: string, enabled: boolean) {
    return handleToggleEntryHandler(this, userName, entryId, enabled);
  }

  async handleClearEntries(userName: string) {
    return handleClearEntriesHandler(this, userName);
  }

  async handleBulkAddEntries(userName: string, names: string[]) {
    return handleBulkAddEntriesHandler(this, userName, names);
  }

  async handleSpin(userName: string) {
    return handleSpinHandler(this, userName);
  }

  async handleResetWheel(userName: string) {
    return handleResetWheelHandler(this, userName);
  }

  async handleUpdateSettings(
    userName: string,
    settings: Partial<WheelSettings>,
  ) {
    return handleUpdateSettingsHandler(this, userName, settings);
  }

  broadcast(message: WheelBroadcastMessage) {
    const json = JSON.stringify(message);
    this.sessions.forEach((session, socket) => {
      try {
        session.webSocket.send(json);
      } catch (_err) {
        this.sessions.delete(socket);
      }
    });
  }

  async getWheelData(): Promise<WheelData | undefined> {
    return this.repository.getWheelData();
  }

  async putWheelData(wheelData: WheelData): Promise<void> {
    await this.repository.replaceWheelData(wheelData);
  }
}
