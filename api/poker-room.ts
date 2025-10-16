declare const WebSocketPair: {
  new(): { 0: CfWebSocket; 1: CfWebSocket };
};

import type { DurableObjectState, WebSocket as CfWebSocket, Response as CfResponse } from '@cloudflare/workers-types';

import { PlanningPokerJudge } from './planning-poker-judge';
import type { Env, RoomData, BroadcastMessage, SessionInfo, JiraTicket, StructuredVote, RoomSettings } from './types'
import {
  createInitialRoomData,
  getDefaultEstimateOptions,
  getDefaultRoomSettings,
  getDefaultStructuredVotingOptions,
  getServerDefaults,
} from './utils/defaults'
import { generateVoteOptionsMetadata } from './utils/votes'
import { isStructuredVote, createStructuredVote } from './utils/structured-voting'

export class PokerRoom {
  state: DurableObjectState;
  env: Env;
  sessions: Map<CfWebSocket, SessionInfo>;
  judge: PlanningPokerJudge;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.judge = new PlanningPokerJudge();

    this.state.blockConcurrencyWhile(async () => {
      let roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) {
        roomData = createInitialRoomData({});
        await this.state.storage.put('roomData', roomData);
        return;
      }

      let requiresUpdate = false;

      if (!roomData.settings) {
        roomData.settings = getDefaultRoomSettings();
        requiresUpdate = true;
      } else {
        const defaultSettings = getDefaultRoomSettings();
        roomData.settings = {
          ...defaultSettings,
          ...roomData.settings,
        };
        requiresUpdate = true;
      }

      if (roomData.settings.estimateOptions && !roomData.settings.voteOptionsMetadata) {
        roomData.settings.voteOptionsMetadata = generateVoteOptionsMetadata(
          roomData.settings.estimateOptions,
        );
        requiresUpdate = true;
      }

      if (!roomData.connectedUsers) {
        roomData.connectedUsers = {};
        for (const user of roomData.users) {
          roomData.connectedUsers[user] = false;
        }
        requiresUpdate = true;
      }

      if (!roomData.structuredVotes) {
        roomData.structuredVotes = {};
        requiresUpdate = true;
      }

      if (requiresUpdate) {
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
      const [client, server] = Object.values(pair);

      await this.handleSession(server, roomKey, userName);

      return new Response(null, { status: 101, webSocket: client as any }) as unknown as CfResponse;
    }

    if (url.pathname === '/initialize' && request.method === 'POST') {
      const { roomKey, moderator, passcode, settings, avatar } = await request.json() as { roomKey: string; moderator: string; passcode?: string; settings?: Partial<RoomSettings>; avatar?: string };

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

        roomData = createInitialRoomData({
          key: roomKey,
          users: [moderator],
          moderator,
          connectedUsers: { [moderator]: true },
        });

        if (settings) {
          roomData.settings = {
            ...roomData.settings,
            ...settings,
          };
        }

        if (passcode && passcode.trim()) {
          roomData.passcode = passcode.trim();
        }

        if (avatar) {
          roomData.userAvatars = { [moderator]: avatar };
        }

        await this.state.storage.put('roomData', roomData);

        const defaults = getServerDefaults();

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
            defaults,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    if (url.pathname === '/join' && request.method === 'POST') {
      const { name, passcode, avatar } = (await request.json()) as { name: string; passcode?: string; avatar?: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        if (roomData.passcode && roomData.passcode.trim()) {
          if (!passcode || passcode.trim() !== roomData.passcode.trim()) {
            return new Response(JSON.stringify({ error: 'Invalid passcode' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }) as unknown as CfResponse;
          }
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

        if (avatar) {
          if (!roomData.userAvatars) {
            roomData.userAvatars = {};
          }
          roomData.userAvatars[name] = avatar;
        }

        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'userJoined',
          user: name,
          avatar: avatar,
        });

        const defaults = getServerDefaults();

        return new Response(
          JSON.stringify({
            success: true,
            room: roomData,
            defaults,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ) as unknown as CfResponse;
      });
    }

    if (url.pathname === '/vote' && request.method === 'POST') {
      const { name, vote } = (await request.json()) as {
        name: string;
        vote: string | number;
      };

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

        const structuredVote = isStructuredVote(vote)
          ? roomData.structuredVotes?.[name]
          : undefined;

        this.broadcast({
          type: 'vote',
          user: name,
          vote,
          structuredVote,
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
      const { name } = (await request.json()) as { name: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        if (
          roomData.moderator !== name &&
          !roomData.settings.allowOthersToShowEstimates
        ) {
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
      const { name } = (await request.json()) as { name: string };

      return await this.state.blockConcurrencyWhile(async () => {
        const roomData = await this.state.storage.get<RoomData>('roomData');

        if (!roomData || !roomData.key) {
          return new Response(JSON.stringify({ error: 'Room not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }) as unknown as CfResponse;
        }

        if (
          roomData.moderator !== name &&
          !roomData.settings.allowOthersToDeleteEstimates
        ) {
          return new Response(
            JSON.stringify({ error: 'Only the moderator can reset votes' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ) as unknown as CfResponse;
        }

        roomData.votes = {};
        roomData.structuredVotes = {};
        roomData.showVotes = false;
        await this.state.storage.put('roomData', roomData);
        if (
          roomData?.settings?.estimateOptions &&
          !roomData?.settings?.voteOptionsMetadata
        ) {
          console.log('Adding missing voteOptionsMetadata');
          roomData.settings.voteOptionsMetadata = generateVoteOptionsMetadata(
            roomData.settings.estimateOptions
          );
          await this.state.storage.put('roomData', roomData);
        }

        this.broadcast({
          type: 'resetVotes',
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
      const { name, settings } = (await request.json()) as {
        name: string;
        settings: RoomData['settings'];
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

        const providedSettings = settings as Partial<RoomData['settings']>;

        const defaultSettings = getDefaultRoomSettings();
        const newSettings = {
          ...defaultSettings,
          ...roomData.settings,
          ...providedSettings,
        };

        if (providedSettings.enableStructuredVoting === true) {
          const structuredOptions = getDefaultStructuredVotingOptions();
          newSettings.estimateOptions = structuredOptions;
          newSettings.voteOptionsMetadata =
            generateVoteOptionsMetadata(structuredOptions);
          if (!newSettings.votingCriteria) {
            newSettings.votingCriteria = defaultSettings.votingCriteria;
          }
        } else if (
          providedSettings.enableStructuredVoting === false &&
          !providedSettings.estimateOptions
        ) {
          const defaultOptions = getDefaultEstimateOptions();
          newSettings.estimateOptions = defaultOptions;
          newSettings.voteOptionsMetadata =
            generateVoteOptionsMetadata(defaultOptions);
          if (!newSettings.votingCriteria) {
            newSettings.votingCriteria = defaultSettings.votingCriteria;
          }
        }

        if (providedSettings.estimateOptions) {
          newSettings.voteOptionsMetadata = generateVoteOptionsMetadata(
            providedSettings.estimateOptions
          );
        }

        roomData.settings = newSettings;

        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'settingsUpdated',
          settings: roomData.settings,
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

    if (url.pathname === '/jira/ticket' && request.method === 'POST') {
      const { name, ticket } = (await request.json()) as {
        name: string;
        ticket: JiraTicket;
      };

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

        roomData.jiraTicket = ticket;
        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'jiraTicketUpdated',
          ticket: roomData.jiraTicket,
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

    if (url.pathname === '/jira/ticket/clear' && request.method === 'POST') {
      const { name } = (await request.json()) as { name: string };

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

        delete roomData.jiraTicket;
        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'jiraTicketCleared',
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

    return new Response('Not found', { status: 404 }) as unknown as CfResponse;
  }

  async handleSession(webSocket: CfWebSocket, roomKey: string, userName: string) {
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

        if (
          !roomData.settings.voteOptionsMetadata &&
          roomData.settings.estimateOptions
        ) {
          roomData.settings.voteOptionsMetadata = generateVoteOptionsMetadata(
            roomData.settings.estimateOptions
          );
        }

        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'userConnectionStatus',
          user: userName,
          isConnected: true,
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
        const messageData =
          typeof msg.data === 'string'
            ? msg.data
            : new TextDecoder().decode(msg.data);
        const data = JSON.parse(messageData);

        if (data.type === 'vote') {
          await this.handleVote(userName, data.vote);
        } else if (data.type === 'showVotes') {
          await this.handleShowVotes(userName);
        } else if (data.type === 'resetVotes') {
          await this.handleResetVotes(userName);
        } else if (data.type === 'updateSettings') {
          await this.handleUpdateSettings(userName, data.settings);
        } else if (data.type === 'updateJiraTicket') {
          await this.handleUpdateJiraTicket(userName, data.ticket);
        } else if (data.type === 'clearJiraTicket') {
          await this.handleClearJiraTicket(userName);
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
            });

            if (userName === roomData.moderator && roomData.settings.autoHandoverModerator) {
              const connectedUsers = roomData.users.filter(
                (user) => roomData.connectedUsers[user]
              );

              if (connectedUsers.length > 0) {
                roomData.moderator = connectedUsers[0];
                await this.state.storage.put('roomData', roomData);

                this.broadcast({
                  type: 'newModerator',
                  moderator: roomData.moderator,
                });
              }
            }
          }
        });
      }
    });
  }

  async handleVote(userName: string, vote: string | number | StructuredVote) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return;

      // If it's a structured vote, calculate the story points and store both
      let finalVote: string | number;
      let structuredVotePayload: StructuredVote | null = null;
      if (isStructuredVote(vote)) {
        const structuredVote = createStructuredVote(vote.criteriaScores);
        const calculatedPoints = structuredVote.calculatedStoryPoints || '?';
        finalVote = calculatedPoints;
        if (!roomData.structuredVotes) {
          roomData.structuredVotes = {};
        }
        roomData.structuredVotes[userName] = structuredVote;
        structuredVotePayload = structuredVote;
      } else {
        finalVote = vote;
      }

      roomData.votes[userName] = finalVote;

      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'vote',
        user: userName,
        vote: finalVote,
        structuredVote: structuredVotePayload,
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
      roomData.structuredVotes = {};
      roomData.showVotes = false;
      roomData.judgeScore = null;
      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'resetVotes',
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

      const defaultSettings = getDefaultRoomSettings();
      const updatedSettings = {
        ...defaultSettings,
        ...roomData.settings,
        ...settings
      };

      if (settings.enableStructuredVoting === true) {
        const structuredOptions = getDefaultStructuredVotingOptions();
        updatedSettings.estimateOptions = structuredOptions;
        updatedSettings.voteOptionsMetadata = generateVoteOptionsMetadata(structuredOptions);
        if (!updatedSettings.votingCriteria) {
          updatedSettings.votingCriteria = defaultSettings.votingCriteria;
        }
      } else if (settings.enableStructuredVoting === false && !settings.estimateOptions) {
        const defaultOptions = getDefaultEstimateOptions();
        updatedSettings.estimateOptions = defaultOptions;
        updatedSettings.voteOptionsMetadata = generateVoteOptionsMetadata(defaultOptions);
        if (!updatedSettings.votingCriteria) {
          updatedSettings.votingCriteria = defaultSettings.votingCriteria;
        }
      }

      if (estimateOptionsChanged && updatedSettings.estimateOptions) {
        updatedSettings.voteOptionsMetadata = generateVoteOptionsMetadata(updatedSettings.estimateOptions);
      }
      roomData.settings = updatedSettings;
      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'settingsUpdated',
        settings: roomData.settings,
      });

      if (
        judgeSettingsChanged &&
        roomData.showVotes &&
        roomData.settings.enableJudge
      ) {
        await this.calculateAndUpdateJudgeScore();
      } else if (judgeSettingsChanged && !roomData.settings.enableJudge) {
        roomData.judgeScore = null;
        await this.state.storage.put('roomData', roomData);

        this.broadcast({
          type: 'judgeScoreUpdated',
          judgeScore: null,
        });
      }
    });
  }

  broadcast(message: BroadcastMessage) {
    const json = JSON.stringify(message);
    for (const session of this.sessions.values()) {
      try {
        session.webSocket.send(json);
      } catch (_err) {
        // Ignore errors (the WebSocket might already be closed)
      }
    }
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
      });
    });
  }

  async handleUpdateJiraTicket(userName: string, ticket: JiraTicket) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return;

      if (!roomData.users.includes(userName)) {
        return;
      }

      roomData.jiraTicket = ticket;
      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'jiraTicketUpdated',
        ticket: roomData.jiraTicket,
      });
    });
  }

  async handleClearJiraTicket(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.state.storage.get<RoomData>('roomData');
      if (!roomData) return;

      if (!roomData.users.includes(userName)) {
        return;
      }

      delete roomData.jiraTicket;
      await this.state.storage.put('roomData', roomData);

      this.broadcast({
        type: 'jiraTicketCleared',
      });
    });
  }
}
