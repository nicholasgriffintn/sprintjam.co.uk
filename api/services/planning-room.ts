declare const WebSocketPair: {
  new (): { 0: CfWebSocket; 1: CfWebSocket };
};

import type {
  DurableObjectState,
  WebSocket as CfWebSocket,
  Response as CfResponse,
} from '@cloudflare/workers-types';

import { PlanningPokerJudge } from '../lib/planning-poker-judge';
import type {
  Env,
  RoomData,
  BroadcastMessage,
  SessionInfo,
  JiraTicket,
  StructuredVote,
} from '../types';
import { createInitialRoomData } from '../utils/defaults';
import {
  isStructuredVote,
  createStructuredVote,
} from '../utils/structured-voting';
import {
  generateStrudelCode,
  type StrudelGenerateRequest,
} from '../lib/polychat-client';
import { markUserConnection, normalizeRoomData } from '../utils/room-data';
import { applySettingsUpdate } from '../utils/room-settings';
import { determineRoomPhase } from '../utils/room-phase';
import { selectPresetForPhase } from '../utils/strudel';
import {
  handleHttpRequest,
  type PlanningRoomHttpContext,
} from './planning-room-http';
import { PlanningRoomRepository } from '../repositories/planning-room';

export class PlanningRoom implements PlanningRoomHttpContext {
  state: DurableObjectState;
  env: Env;
  sessions: Map<CfWebSocket, SessionInfo>;
  judge: PlanningPokerJudge;
  repository: PlanningRoomRepository;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.judge = new PlanningPokerJudge();
    this.repository = new PlanningRoomRepository(this.state.storage);

    this.state.blockConcurrencyWhile(async () => {
      this.repository.initializeSchema();
      let roomData = await this.getRoomData();
      if (!roomData) {
        roomData = createInitialRoomData({});
        await this.putRoomData(roomData);
        return;
      }

      const normalizedRoomData = normalizeRoomData(roomData);
      await this.putRoomData(normalizedRoomData);
    });
  }

  async fetch(request: Request): Promise<CfResponse> {
    const url = new URL(request.url);

    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const roomKey = url.searchParams.get('room');
      const userName = url.searchParams.get('name');

      if (!roomKey || !userName) {
        return new Response('Missing room key or user name', {
          status: 400,
        }) as unknown as CfResponse;
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server, roomKey, userName);

      return new Response(null, {
        status: 101,
        webSocket: client as any,
      }) as unknown as CfResponse;
    }

    const httpResponse = await handleHttpRequest(this, request);
    if (httpResponse) {
      return httpResponse;
    }

    return new Response('Not found', { status: 404 }) as unknown as CfResponse;
  }

  async handleSession(
    webSocket: CfWebSocket,
    roomKey: string,
    userName: string
  ) {
    const session = { webSocket, roomKey, userName };
    this.sessions.set(webSocket, session);

    webSocket.accept();

    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) {
        return;
      }

      const normalizedRoomData = normalizeRoomData(roomData);
      markUserConnection(normalizedRoomData, userName, true);

      this.repository.setUserConnection(userName, true);

      this.broadcast({
        type: 'userConnectionStatus',
        user: userName,
        isConnected: true,
      });
    });

    const roomData = await this.getRoomData();
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
        } else if (data.type === 'generateStrudelCode') {
          await this.handleGenerateStrudel(userName);
        } else if (data.type === 'toggleStrudelPlayback') {
          await this.handleToggleStrudelPlayback(userName);
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
          const roomData = await this.getRoomData();

          if (roomData) {
            markUserConnection(roomData, userName, false);

            this.repository.setUserConnection(userName, false);
            this.broadcast({
              type: 'userConnectionStatus',
              user: userName,
              isConnected: false,
            });

            if (
              userName === roomData.moderator &&
              roomData.settings.autoHandoverModerator
            ) {
              const connectedUsers = roomData.users
                .filter((user) => roomData.connectedUsers[user])
                .sort((a, b) => a.localeCompare(b));

              if (connectedUsers.length > 0) {
                roomData.moderator = connectedUsers[0];
                this.repository.setModerator(roomData.moderator);

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
    let shouldGenerateMusic = false;

    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) {
        return;
      }

      const previousPhase = determineRoomPhase(roomData);

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

      const validOptions = roomData.settings.estimateOptions.map(String);
      if (!validOptions.includes(String(finalVote))) {
        console.warn(
          `Invalid vote ${finalVote} from ${userName}. Valid options: ${validOptions.join(', ')}`
        );
        return;
      }

      roomData.votes[userName] = finalVote;
      const newPhase = determineRoomPhase(roomData);

      this.repository.setVote(userName, finalVote);

      if (structuredVotePayload) {
        this.repository.setStructuredVote(userName, structuredVotePayload);
      }

      this.broadcast({
        type: 'vote',
        user: userName,
        vote: finalVote,
        structuredVote: structuredVotePayload,
      });

      if (roomData.showVotes && roomData.settings.enableJudge) {
        await this.calculateAndUpdateJudgeScore();
      }

      shouldGenerateMusic =
        previousPhase !== newPhase &&
        !!roomData.settings.enableStrudelPlayer &&
        !!roomData.settings.strudelAutoGenerate;
    });

    if (shouldGenerateMusic) {
      this.autoGenerateStrudel().catch((err) =>
        console.error('Background Strudel generation failed:', err)
      );
    }
  }

  async handleShowVotes(userName: string) {
    let shouldGenerateMusic = false;

    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (
        roomData.moderator !== userName &&
        !roomData.settings.allowOthersToShowEstimates
      ) {
        return;
      }

      const previousPhase = determineRoomPhase(roomData);
      roomData.showVotes = !roomData.showVotes;
      const newPhase = determineRoomPhase(roomData);

      this.repository.setShowVotes(roomData.showVotes);

      this.broadcast({
        type: 'showVotes',
        showVotes: roomData.showVotes,
      });

      if (roomData.showVotes && roomData.settings.enableJudge) {
        await this.calculateAndUpdateJudgeScore();
      }

      shouldGenerateMusic =
        previousPhase !== newPhase &&
        !!roomData.settings.enableStrudelPlayer &&
        !!roomData.settings.strudelAutoGenerate;
    });

    if (shouldGenerateMusic) {
      this.autoGenerateStrudel().catch((err) =>
        console.error('Background Strudel generation failed:', err)
      );
    }
  }

  async handleResetVotes(userName: string) {
    let shouldGenerateMusic = false;

    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (
        roomData.moderator !== userName &&
        !roomData.settings.allowOthersToDeleteEstimates
      ) {
        return;
      }

      const previousPhase = determineRoomPhase(roomData);
      roomData.votes = {};
      roomData.structuredVotes = {};
      roomData.showVotes = false;
      roomData.judgeScore = null;
      roomData.judgeMetadata = undefined;
      const newPhase = determineRoomPhase(roomData);

      this.repository.clearVotes();
      this.repository.clearStructuredVotes();
      this.repository.setShowVotes(roomData.showVotes);
      this.repository.setJudgeState(null);

      this.broadcast({
        type: 'resetVotes',
      });

      shouldGenerateMusic =
        previousPhase !== newPhase &&
        !!roomData.settings.enableStrudelPlayer &&
        !!roomData.settings.strudelAutoGenerate;
    });

    if (shouldGenerateMusic) {
      this.autoGenerateStrudel().catch((err) =>
        console.error('Background Strudel generation failed:', err)
      );
    }
  }

  async handleUpdateSettings(
    userName: string,
    settings: Partial<RoomData['settings']>
  ) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (roomData.moderator !== userName) {
        return;
      }
      const judgeSettingsChanged =
        (settings.enableJudge !== undefined &&
          settings.enableJudge !== roomData.settings.enableJudge) ||
        (settings.judgeAlgorithm !== undefined &&
          settings.judgeAlgorithm !== roomData.settings.judgeAlgorithm);

      const oldEstimateOptions = roomData.settings.estimateOptions.map(String);
      const oldStructuredVoting = roomData.settings.enableStructuredVoting;
      const newSettings = applySettingsUpdate({
        currentSettings: roomData.settings,
        settingsUpdate: settings,
      });
      const newEstimateOptions = newSettings.estimateOptions.map(String);
      const newStructuredVoting = newSettings.enableStructuredVoting;

      const estimateOptionsChanged =
        oldEstimateOptions.length !== newEstimateOptions.length ||
        !oldEstimateOptions.every((opt, idx) => opt === newEstimateOptions[idx]);

      const structuredVotingModeChanged = oldStructuredVoting !== newStructuredVoting;

      roomData.settings = newSettings;
      this.repository.setSettings(roomData.settings);

      if (estimateOptionsChanged) {
        const validOptions = newEstimateOptions;
        const invalidVotes = Object.entries(roomData.votes).filter(
          ([, vote]) => !validOptions.includes(String(vote))
        );

        if (invalidVotes.length > 0) {
          roomData.votes = {};
          roomData.structuredVotes = {};
          roomData.showVotes = false;
          roomData.judgeScore = null;
          roomData.judgeMetadata = undefined;

          this.repository.clearVotes();
          this.repository.clearStructuredVotes();
          this.repository.setShowVotes(false);
          this.repository.setJudgeState(null);

          this.broadcast({
            type: 'resetVotes',
          });
        }
      } else if (structuredVotingModeChanged && !newStructuredVoting) {
        if (roomData.structuredVotes && Object.keys(roomData.structuredVotes).length > 0) {
          roomData.structuredVotes = {};
          this.repository.clearStructuredVotes();
        }
      }

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
        roomData.judgeMetadata = undefined;
        this.repository.setJudgeState(null);

        this.broadcast({
          type: 'judgeScoreUpdated',
          judgeScore: null,
        });
      }
    });
  }

  broadcast(message: BroadcastMessage) {
    const json = JSON.stringify(message);
    this.sessions.forEach((session) => {
      try {
        session.webSocket.send(json);
      } catch (_err) {}
    });
  }

  async calculateAndUpdateJudgeScore() {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();

      if (!roomData || !roomData.settings.enableJudge || !roomData.showVotes) {
        return;
      }

      const allVotes = Object.values(roomData.votes).filter((v) => v !== null);
      const totalVoteCount = allVotes.length;
      const questionMarkCount = allVotes.filter((v) => v === '?').length;

      const votes = allVotes.filter((v) => v !== '?');
      const numericVotes = votes
        .filter((v) => !Number.isNaN(Number(v)))
        .map(Number);

      const validOptions = roomData.settings.estimateOptions
        .filter((opt) => !Number.isNaN(Number(opt)))
        .map(Number)
        .sort((a, b) => a - b);

      const result = this.judge.calculateJudgeScore(
        numericVotes,
        roomData.settings.judgeAlgorithm,
        validOptions,
        totalVoteCount,
        questionMarkCount
      );

      roomData.judgeScore = result.score;
      roomData.judgeMetadata = {
        confidence: result.confidence,
        needsDiscussion: result.needsDiscussion,
        reasoning: result.reasoning,
        algorithm: roomData.settings.judgeAlgorithm,
      };

      this.repository.setJudgeState(result.score, roomData.judgeMetadata);

      this.broadcast({
        type: 'judgeScoreUpdated',
        judgeScore: result.score,
        judgeMetadata: roomData.judgeMetadata,
      });
    });
  }

  async handleUpdateJiraTicket(userName: string, ticket: JiraTicket) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (!roomData.users.includes(userName)) {
        return;
      }

      roomData.jiraTicket = ticket;
      this.repository.setJiraTicket(roomData.jiraTicket);

      this.broadcast({
        type: 'jiraTicketUpdated',
        ticket: roomData.jiraTicket,
      });
    });
  }

  async handleClearJiraTicket(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (!roomData.users.includes(userName)) {
        return;
      }

      delete roomData.jiraTicket;
      this.repository.setJiraTicket(undefined);

      this.broadcast({
        type: 'jiraTicketCleared',
      });
    });
  }

  async handleGenerateStrudel(userName: string) {
    const roomData = await this.getRoomData();
    if (!roomData) return;

    if (roomData.moderator !== userName) {
      return;
    }

    await this.generateStrudelTrack(roomData, {
      notifyOnError: true,
      logPrefix: 'Failed to generate Strudel code',
    });
  }

  async autoGenerateStrudel() {
    const roomData = await this.getRoomData();
    if (!roomData) return;

    await this.generateStrudelTrack(roomData, {
      logPrefix: 'Failed to auto-generate Strudel code',
    });
  }

  async generateStrudelTrack(
    roomData: RoomData,
    options: { notifyOnError?: boolean; logPrefix?: string } = {}
  ) {
    const {
      notifyOnError = false,
      logPrefix = 'Failed to generate Strudel code',
    } = options;

    if (!roomData.settings.enableStrudelPlayer) {
      return;
    }

    const apiToken = this.env.POLYCHAT_API_TOKEN;
    if (!apiToken) {
      console.error('POLYCHAT_API_TOKEN not configured');
      if (notifyOnError) {
        this.broadcast({
          type: 'error',
          error: 'Music generation is not configured on this server',
        });
      }
      return;
    }

    try {
      const phase = determineRoomPhase(roomData);
      const preset = selectPresetForPhase(phase);

      const request: StrudelGenerateRequest = {
        prompt: preset.prompt,
        style: preset.style,
        tempo: preset.tempo,
        complexity: preset.complexity,
      };

      const response = await generateStrudelCode(request, apiToken);

      if (!response.code || !response.generationId) {
        throw new Error('Invalid response from music generation service');
      }

      roomData.currentStrudelCode = response.code;
      roomData.currentStrudelGenerationId = response.generationId;
      roomData.strudelPhase = phase;

      this.repository.setStrudelState({
        code: roomData.currentStrudelCode,
        generationId: roomData.currentStrudelGenerationId,
        phase: roomData.strudelPhase,
      });

      this.broadcast({
        type: 'strudelCodeGenerated',
        code: response.code,
        generationId: response.generationId,
        phase,
      });
    } catch (error) {
      console.error(`${logPrefix}:`, error);
      if (notifyOnError) {
        this.broadcast({
          type: 'error',
          error:
            error instanceof Error ? error.message : 'Failed to generate music',
        });
      }
    }
  }

  async handleToggleStrudelPlayback(userName: string) {
    const roomData = await this.getRoomData();
    if (!roomData) return;

    if (roomData.moderator !== userName) {
      return;
    }

    roomData.strudelIsPlaying = !roomData.strudelIsPlaying;
    this.repository.setStrudelPlayback(!!roomData.strudelIsPlaying);

    this.broadcast({
      type: 'initialize',
      roomData,
    });
  }

  async getRoomData(): Promise<RoomData | undefined> {
    return this.repository.getRoomData();
  }

  async putRoomData(roomData: RoomData): Promise<void> {
    await this.repository.replaceRoomData(roomData);
  }
}
