declare const WebSocketPair: {
  new(): { 0: WebSocket; 1: WebSocket };
};

import type { DurableObjectState, WebSocket, Response as CfResponse } from '@cloudflare/workers-types';
import type { Env } from './index';
import { PlanningPokerJudge } from './planning-poker-judge';

const VOTING_OPTIONS = ['1', '2', '3', '5', '8', '13', '21', '?'];

type JudgeAlgorithm = 'smartConsensus' | 'conservativeMode' | 'optimisticMode' | 'simpleAverage';

type TaskSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface VoteOptionMetadata {
  value: string | number;
  background: string;
  taskSize: TaskSize | null;
}

interface RoomData {
  key: string;
  users: string[];
  votes: Record<string, string | number>;
  showVotes: boolean;
  moderator: string;
  connectedUsers: Record<string, boolean>;
  judgeScore?: string | number | null;
  judgeMetadata?: Record<string, unknown>;
  settings: {
    estimateOptions: (string | number)[];
    voteOptionsMetadata?: VoteOptionMetadata[];
    allowOthersToShowEstimates: boolean;
    allowOthersToDeleteEstimates: boolean;
    showTimer: boolean;
    showUserPresence: boolean;
    showAverage: boolean;
    showMedian: boolean;
    anonymousVotes: boolean;
    enableJudge: boolean;
    judgeAlgorithm: JudgeAlgorithm;
  };
}

interface BroadcastMessage {
  type: string;
  [key: string]: unknown;
}

interface SessionInfo {
  webSocket: WebSocket;
  roomKey: string;
  userName: string;
}

/**
 * Generates metadata for vote options including background colors and task sizes
 */
export function generateVoteOptionsMetadata(options: (string | number)[]): VoteOptionMetadata[] {
  const specialColorMap: Record<string, string> = {
    '?': '#f2f2ff',
    'coffee': '#f5e6d8',
    'break': '#f8e8c8'
  };


  /**
   * Generates a color based on the numeric value
   * Creates a vibrant spectrum from happy blues to warm reds
   */
  function generateColorFromValue(value: number, maxValue: number): string {
    if (value === 0) return '#f0f0f0';

    const normalizedValue = Math.min(value / maxValue, 1);

    const startHue = 220;
    const endHue = 15;

    const hue = startHue - (normalizedValue * (startHue - endHue));

    const saturation = 65 + (normalizedValue * 20);

    const lightness = 75 + (normalizedValue * 10);

    return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
  }

  /**
   * Creates a pleasing color for non-numeric string values based on the string content
   */
  function generateColorFromString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const h = hash % 360;
    const s = 25 + (hash % 30);
    const l = 85 + (hash % 10);

    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  /**
   * Map numeric values to task sizes using a logarithmic scale
   * This ensures appropriate task size categorization for any scale
   */
  function getTaskSize(value: string | number): TaskSize | null {
    if (typeof value === 'string' && isNaN(Number(value))) {
      return null;
    }

    const numValue = Number(value);

    if (numValue === 0) return 'xs';
    if (numValue <= 1) return 'xs';
    if (numValue <= 2) return 'sm';
    if (numValue <= 4) return 'md';
    if (numValue <= 8) return 'lg';
    return 'xl';
  }

  const numericValues = options.filter(value => !isNaN(Number(value))).map(value => Number(value));
  const maxValue = (numericValues.length > 0 ? Math.max(...numericValues) : 34);

  return options.map(value => {
    let background: string;
    const stringValue = String(value);

    if (specialColorMap[stringValue]) {
      background = specialColorMap[stringValue];
    }
    else if (!isNaN(Number(value))) {
      background = generateColorFromValue(Number(value), maxValue);
    }
    else {
      background = generateColorFromString(stringValue);
    }

    const taskSize = getTaskSize(value);

    return {
      value,
      background,
      taskSize
    };
  });
}

export class PokerRoom {
  state: DurableObjectState;
  env: Env;
  sessions: Map<WebSocket, SessionInfo>;
  judge: PlanningPokerJudge;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.judge = new PlanningPokerJudge();

    this.state.blockConcurrencyWhile(async () => {
      let roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) {
        const initialEstimateOptions = VOTING_OPTIONS;
        const initialVoteOptionsMetadata = generateVoteOptionsMetadata(initialEstimateOptions);

        roomData = {
          key: '',
          users: [],
          votes: {},
          showVotes: false,
          moderator: '',
          connectedUsers: {},
          judgeScore: null,
          settings: {
            estimateOptions: initialEstimateOptions,
            voteOptionsMetadata: initialVoteOptionsMetadata,
            allowOthersToShowEstimates: true,
            allowOthersToDeleteEstimates: true,
            showTimer: false,
            showUserPresence: false,
            showAverage: false,
            showMedian: false,
            anonymousVotes: true,
            enableJudge: true,
            judgeAlgorithm: 'smartConsensus',
          }
        };
        await this.state.storage.put('roomData', roomData);
      } else if (!roomData.connectedUsers) {
        roomData.connectedUsers = {};
        for (const user of roomData.users) {
          roomData.connectedUsers[user] = false;
        }
        await this.state.storage.put('roomData', roomData);
      }
    });
  }

  async fetch(request: Request): Promise<CfResponse> {
    const url = new URL(request.url);

    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const roomKey = url.searchParams.get('room');
      const userName = url.searchParams.get('name');

      if (!roomKey || !userName) {
        return new Response('Missing room key or user name', { status: 400 }) as unknown as CfResponse;
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

      await this.handleSession(server, roomKey, userName);

      return new Response(null, { status: 101, webSocket: client } as unknown as CfResponse) as unknown as CfResponse;
    }

    if (url.pathname === '/initialize' && request.method === 'POST') {
      const { roomKey, moderator } = await request.json() as { roomKey: string; moderator: string };

      return await this.state.blockConcurrencyWhile(async () => {
        let roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData) {
          // TODO: Handle case where roomData is not found during initialization attempt
          // This scenario might need specific logic depending on requirements,
          // maybe return an error or proceed with initialization.
          // For now, let's assume initialization proceeds if roomData is null/undefined.
        } else if (roomData.key) {
          return new Response(
            JSON.stringify({ error: 'Room already exists' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        const initialEstimateOptions = VOTING_OPTIONS;
        const initialVoteOptionsMetadata = generateVoteOptionsMetadata(initialEstimateOptions);

        roomData = {
          key: roomKey,
          users: [moderator],
          votes: {},
          showVotes: false,
          moderator,
          connectedUsers: { [moderator]: true },
          judgeScore: null,
          settings: {
            estimateOptions: initialEstimateOptions,
            voteOptionsMetadata: initialVoteOptionsMetadata,
            allowOthersToShowEstimates: true,
            allowOthersToDeleteEstimates: true,
            showTimer: false,
            showUserPresence: false,
            showAverage: false,
            showMedian: false,
            anonymousVotes: true,
            enableJudge: true,
            judgeAlgorithm: 'smartConsensus',
          }
        };

        await this.state.storage.put('roomData', roomData);

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    if (url.pathname === '/join' && request.method === 'POST') {
      const { name } = await request.json() as { name: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        if (!roomData.connectedUsers) {
          roomData.connectedUsers = {};
          for (const user of roomData.users) {
            roomData.connectedUsers[user] = false;
          }
        }

        if (!roomData.users.includes(name)) {
          roomData.users.push(name);
        }
        roomData.connectedUsers[name] = true;

        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'userJoined',
          name,
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    if (url.pathname === '/vote' && request.method === 'POST') {
      const { name, vote } = await request.json() as { name: string; vote: string | number };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        if (!roomData.users.includes(name)) {
          return new Response(
            JSON.stringify({ error: 'User not found in this room' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        roomData.votes[name] = vote;
        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'vote',
          name,
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    if (url.pathname === '/showVotes' && request.method === 'POST') {
      const { name } = await request.json() as { name: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        if (roomData.moderator !== name && !roomData.settings.allowOthersToShowEstimates) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can show votes' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        roomData.showVotes = !roomData.showVotes;
        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'showVotes',
          showVotes: roomData.showVotes,
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    if (url.pathname === '/resetVotes' && request.method === 'POST') {
      const { name } = await request.json() as { name: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        if (roomData.moderator !== name && !roomData.settings.allowOthersToDeleteEstimates) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can reset votes' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        roomData.votes = {};
        roomData.showVotes = false;
        await this.state.storage.put('roomData', roomData);
        if (roomData && roomData.settings && roomData.settings.estimateOptions && !roomData.settings.voteOptionsMetadata) {
          console.log('Adding missing voteOptionsMetadata');
          roomData.settings.voteOptionsMetadata = generateVoteOptionsMetadata(roomData.settings.estimateOptions);
          await this.state.storage.put('roomData', roomData);
        }

        this.broadcast({
          type: 'resetVotes',
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    if (url.pathname === '/settings' && request.method === 'GET') {
      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        return new Response(
          JSON.stringify({
            success: true,
            settings: roomData.settings,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    if (url.pathname === '/settings' && request.method === 'PUT') {
      const { name, settings } = await request.json() as {
        name: string;
        settings: RoomData['settings']
      };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        if (roomData.moderator !== name) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can update settings' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        roomData.settings = {
          ...roomData.settings,
          ...settings
        };
        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'settingsUpdated',
          settings: roomData.settings,
          roomData,
        });

        return new Response(
          JSON.stringify({
            success: true,
            settings: roomData.settings,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    return new Response('Not found', { status: 404 }) as unknown as CfResponse;
  }

  async handleSession(webSocket: WebSocket, roomKey: string, userName: string) {
    const session = { webSocket, roomKey, userName };
    this.sessions.set(webSocket, session);

    webSocket.accept();

    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (roomData) {
        if (!roomData.connectedUsers) {
          roomData.connectedUsers = {};
          for (const user of roomData.users) {
            roomData.connectedUsers[user] = false;
          }
        }

        if (!roomData.users.includes(userName)) {
          roomData.users.push(userName);
        }
        roomData.connectedUsers[userName] = true;

        if (!roomData.settings.voteOptionsMetadata && roomData.settings.estimateOptions) {
          roomData.settings.voteOptionsMetadata = generateVoteOptionsMetadata(roomData.settings.estimateOptions);
        }

        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'userConnectionStatus',
          user: userName,
          isConnected: true,
          roomData,
        });
      }
    });

    const roomData = await this.state.storage.get<RoomData>('roomData');
    webSocket.send(
      JSON.stringify({
        type: 'initialize',
        roomData,
      })
    );

    webSocket.addEventListener('message', async (msg) => {
      try {
        const messageData = typeof msg.data === 'string' ? msg.data : new TextDecoder().decode(msg.data);
        const data = JSON.parse(messageData);

        if (data.type === 'vote') {
          await this.handleVote(userName, data.vote);
        } else if (data.type === 'showVotes') {
          await this.handleShowVotes(userName);
        } else if (data.type === 'resetVotes') {
          await this.handleResetVotes(userName);
        } else if (data.type === 'updateSettings') {
          await this.handleUpdateSettings(userName, data.settings);
        }
      } catch (err: unknown) {
        webSocket.send(
          JSON.stringify({
            type: 'error',
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    });

    webSocket.addEventListener('close', async () => {
      this.sessions.delete(webSocket);
      const stillConnected = Array.from(this.sessions.values()).some(
        (s: SessionInfo) => s.userName === userName
      );

      if (!stillConnected) {
        await this.state.blockConcurrencyWhile(async () => {
          const roomData = await this.state.storage.get<RoomData>('roomData');

          if (roomData) {
            if (!roomData.connectedUsers) {
              roomData.connectedUsers = {};
              for (const user of roomData.users) {
                roomData.connectedUsers[user] = false;
              }
            }

            roomData.connectedUsers[userName] = false;

            await this.state.storage.put('roomData', roomData);
            this.broadcast({
              type: 'userConnectionStatus',
              user: userName,
              isConnected: false,
              roomData,
            });

            if (userName === roomData.moderator) {
              const connectedUsers = roomData.users.filter(user => roomData.connectedUsers[user]);

              if (connectedUsers.length > 0) {
                roomData.moderator = connectedUsers[0];
                await this.state.storage.put('roomData', roomData);

                this.broadcast({
                  type: 'newModerator',
                  name: roomData.moderator,
                  roomData,
                });
              }
            }
          }
        });
      }
    });
  }

  async handleVote(userName: string, vote: string | number) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return;

      roomData.votes[userName] = vote;
      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'vote',
        name: userName,
        roomData,
      });

      if (roomData.showVotes && roomData.settings.enableJudge) {
        await this.calculateAndUpdateJudgeScore();
      }
    });
  }

  async handleShowVotes(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return;

      if (roomData.moderator !== userName && !roomData.settings.allowOthersToShowEstimates) {
        return;
      }
      roomData.showVotes = !roomData.showVotes;
      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'showVotes',
        showVotes: roomData.showVotes,
        roomData,
      });

      if (roomData.showVotes && roomData.settings.enableJudge) {
        await this.calculateAndUpdateJudgeScore();
      }
    });
  }

  async handleResetVotes(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return;

      if (roomData.moderator !== userName && !roomData.settings.allowOthersToDeleteEstimates) {
        return;
      }
      roomData.votes = {};
      roomData.showVotes = false;
      roomData.judgeScore = null;
      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'resetVotes',
        roomData,
      });
    });
  }

  async handleUpdateSettings(userName: string, settings: Partial<RoomData['settings']>) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return;

      if (roomData.moderator !== userName) {
        return;
      }
      const judgeSettingsChanged =
        (settings.enableJudge !== undefined && settings.enableJudge !== roomData.settings.enableJudge) ||
        (settings.judgeAlgorithm !== undefined && settings.judgeAlgorithm !== roomData.settings.judgeAlgorithm);

      const estimateOptionsChanged = settings.estimateOptions !== undefined &&
        JSON.stringify(settings.estimateOptions) !== JSON.stringify(roomData.settings.estimateOptions);

      const updatedSettings = {
        ...roomData.settings,
        ...settings
      };

      if (estimateOptionsChanged && updatedSettings.estimateOptions) {
        updatedSettings.voteOptionsMetadata = generateVoteOptionsMetadata(updatedSettings.estimateOptions);
      }
      roomData.settings = updatedSettings;
      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'settingsUpdated',
        settings: roomData.settings,
        roomData,
      });

      if (judgeSettingsChanged && roomData.showVotes && roomData.settings.enableJudge) {
        await this.calculateAndUpdateJudgeScore();
      } else if (judgeSettingsChanged && !roomData.settings.enableJudge) {
        roomData.judgeScore = null;
        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'judgeScoreUpdated',
          judgeScore: null,
          roomData,
        });
      }
    });
  }

  broadcast(message: BroadcastMessage) {
    const json = JSON.stringify(message);
    for (const session of this.sessions.values()) {
      try {
        session.webSocket.send(json);
      } catch (err) {
        // Ignore errors (the WebSocket might already be closed)
      }
    }
  }

  calculateJudgeScore(numericVotes: number[], algorithm: JudgeAlgorithm, validOptions: number[]): number | null {
    const result = this.judge.calculateJudgeScore(numericVotes, algorithm, validOptions);
    return result.score;
  }

  findClosestOption(value: number, validOptions: number[]): number {
    if (validOptions.length === 0) return value;

    let closest = validOptions[0];
    let closestDiff = Math.abs(value - closest);

    for (const option of validOptions) {
      const diff = Math.abs(value - option);
      if (diff < closestDiff) {
        closest = option;
        closestDiff = diff;
      }
    }

    return closest;
  }
  async calculateAndUpdateJudgeScore() {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');

      if (!roomData || !roomData.settings.enableJudge || !roomData.showVotes) {
        return;
      }

      const votes = Object.values(roomData.votes).filter(v => v !== null && v !== '?');
      const numericVotes = votes.filter(v => !Number.isNaN(Number(v))).map(Number);

      const validOptions = roomData.settings.estimateOptions
        .filter(opt => !Number.isNaN(Number(opt)))
        .map(Number)
        .sort((a, b) => a - b);

      const result = this.judge.calculateJudgeScore(
        numericVotes, 
        roomData.settings.judgeAlgorithm, 
        validOptions
      );

      roomData.judgeScore = result.score;
      roomData.judgeMetadata = {
        confidence: result.confidence,
        needsDiscussion: result.needsDiscussion,
        reasoning: result.reasoning,
        algorithm: roomData.settings.judgeAlgorithm
      };

      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'judgeScoreUpdated',
        judgeScore: result.score,
        judgeMetadata: roomData.judgeMetadata,
        roomData,
      });
    });
  }
}
