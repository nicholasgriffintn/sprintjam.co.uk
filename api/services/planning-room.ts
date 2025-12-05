declare const WebSocketPair: {
  new(): { 0: CfWebSocket; 1: CfWebSocket };
};

import type {
  DurableObjectState,
  WebSocket as CfWebSocket,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import { PlanningPokerJudge } from "../lib/planning-poker-judge";
import type {
  Env,
  RoomData,
  BroadcastMessage,
  SessionInfo,
  StructuredVote,
  TicketQueueItem,
} from '../types';
import {
  isStructuredVote,
  createStructuredVote,
} from '../utils/structured-voting';
import {
  generateStrudelCode,
  type StrudelGenerateRequest,
} from '../lib/polychat-client';
import {
  markUserConnection,
  normalizeRoomData,
  getAnonymousUserId,
  anonymizeRoomData,
  findCanonicalUserName,
} from '../utils/room-data';
import { applySettingsUpdate } from '../utils/room-settings';
import { determineRoomPhase } from '../utils/room-phase';
import { selectPresetForPhase } from '../utils/strudel';
import {
  handleHttpRequest,
  type PlanningRoomHttpContext,
} from './planning-room-http';
import { PlanningRoomRepository } from '../repositories/planning-room';
import { validateClientMessage } from '../utils/validate';
import {
  MAX_TIMER_DURATION_SECONDS,
  MIN_TIMER_DURATION_SECONDS,
} from '../constants';
import { calculateTimerSeconds } from '../utils/timer';
import { ensureTimerState } from '../utils/timer-state';

export class PlanningRoom implements PlanningRoomHttpContext {
  state: DurableObjectState;
  env: Env;
  sessions: Map<CfWebSocket, SessionInfo>;
  heartbeats: Map<CfWebSocket, number>;
  judge: PlanningPokerJudge;
  repository: PlanningRoomRepository;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.heartbeats = new Map();
    this.judge = new PlanningPokerJudge();
    this.repository = new PlanningRoomRepository(this.state.storage);

    this.state.blockConcurrencyWhile(async () => {
      this.repository.initializeSchema();
      let roomData = await this.getRoomData();
      if (!roomData) {
        return;
      }

      const normalizedRoomData = normalizeRoomData(roomData);
      await this.putRoomData(normalizedRoomData);
    });
  }

  disconnectUserSessions(userName: string) {
    for (const [socket, session] of this.sessions.entries()) {
      if (session.userName.toLowerCase() === userName.trim().toLowerCase()) {
        socket.close(4004, 'Session superseded');
        this.sessions.delete(socket);
        this.heartbeats.delete(socket);
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

    return new Response('Not found', { status: 404 }) as unknown as CfResponse;
  }

  async handleSession(
    webSocket: CfWebSocket,
    roomKey: string,
    userName: string,
    sessionToken: string
  ) {
    const storedRoom = await this.getRoomData();
    const canonicalUserName = storedRoom
      ? findCanonicalUserName(storedRoom, userName)
      : undefined;
    const hasRoom =
      storedRoom && storedRoom.key === roomKey && !!canonicalUserName;
    const hasValidToken = canonicalUserName
      ? this.repository.validateSessionToken(canonicalUserName, sessionToken)
      : false;

    if (!hasRoom || !hasValidToken) {
      webSocket.accept();
      webSocket.send(
        JSON.stringify({
          type: 'error',
          error: 'Invalid or expired session. Please rejoin the room.',
        })
      );
      webSocket.close(4003, 'Invalid session token');
      return;
    }

    if (!canonicalUserName) {
      return;
    }

    const session = { webSocket, roomKey, userName: canonicalUserName };
    this.sessions.set(webSocket, session);

    webSocket.accept();

    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) {
        return;
      }

      const normalizedRoomData = normalizeRoomData(roomData);
      markUserConnection(normalizedRoomData, canonicalUserName, true);

      this.repository.setUserConnection(canonicalUserName, true);

      this.broadcast({
        type: 'userConnectionStatus',
        user: canonicalUserName,
        isConnected: true,
      });
    });

    const roomData = await this.getRoomData();
    if (roomData) {
      webSocket.send(
        JSON.stringify({
          type: 'initialize',
          roomData: anonymizeRoomData(roomData),
        })
      );
    } else {
      webSocket.send(
        JSON.stringify({
          type: 'error',
          error: 'Unable to load room data',
        })
      );
      webSocket.close(1011, 'Room data unavailable');
      return;
    }

    webSocket.addEventListener('message', async (msg) => {
      try {
        const messageData =
          typeof msg.data === 'string'
            ? msg.data
            : new TextDecoder().decode(msg.data);
        const data = JSON.parse(messageData);
        this.heartbeats.set(webSocket, Date.now());
        const validated = validateClientMessage(data);

        if ('error' in validated) {
          webSocket.send(
            JSON.stringify({
              type: 'error',
              error: validated.error,
            })
          );
          return;
        }

        if (validated.type === 'ping') {
          return;
        }

        switch (validated.type) {
          case 'vote':
            await this.handleVote(canonicalUserName, validated.vote);
            break;
          case 'showVotes':
            await this.handleShowVotes(canonicalUserName);
            break;
          case 'resetVotes':
            await this.handleResetVotes(canonicalUserName);
            break;
          case 'updateSettings':
            await this.handleUpdateSettings(
              canonicalUserName,
              validated.settings
            );
            break;
          case 'generateStrudelCode':
            await this.handleGenerateStrudel(canonicalUserName);
            break;
          case 'toggleStrudelPlayback':
            await this.handleToggleStrudelPlayback(canonicalUserName);
            break;
          case 'nextTicket':
            await this.handleNextTicket(canonicalUserName);
            break;
          case 'addTicket':
            await this.handleAddTicket(canonicalUserName, validated.ticket);
            break;
          case 'updateTicket':
            await this.handleUpdateTicket(
              canonicalUserName,
              validated.ticketId,
              validated.updates
            );
            break;
          case 'deleteTicket':
            await this.handleDeleteTicket(
              canonicalUserName,
              validated.ticketId
            );
            break;
          case 'completeTicket':
            await this.handleCompleteTicket(
              canonicalUserName,
              validated.outcome
            );
            break;
          case 'startTimer':
            await this.handleStartTimer(canonicalUserName);
            break;
          case 'pauseTimer':
            await this.handlePauseTimer(canonicalUserName);
            break;
          case 'resetTimer':
            await this.handleResetTimer(canonicalUserName);
            break;
          case 'configureTimer':
            await this.handleConfigureTimer(
              canonicalUserName,
              validated.config
            );
            break;
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
      this.heartbeats.delete(webSocket);
      const stillConnected = Array.from(this.sessions.values()).some(
        (s: SessionInfo) => s.userName === canonicalUserName
      );

      if (!stillConnected) {
        await this.state.blockConcurrencyWhile(async () => {
          const roomData = await this.getRoomData();

          if (roomData) {
            markUserConnection(roomData, canonicalUserName, false);

            this.repository.setUserConnection(canonicalUserName, false);
            this.broadcast({
              type: 'userConnectionStatus',
              user: canonicalUserName,
              isConnected: false,
            });

            if (
              canonicalUserName === roomData.moderator &&
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
          `Invalid vote ${finalVote} from ${userName}. Valid options: ${validOptions.join(
            ', '
          )}`
        );
        return;
      }

      roomData.votes[userName] = finalVote;
      const newPhase = determineRoomPhase(roomData);

      this.repository.setVote(userName, finalVote);

      if (structuredVotePayload) {
        this.repository.setStructuredVote(userName, structuredVotePayload);
      }

      const broadcastUser =
        roomData.settings.anonymousVotes ||
        roomData.settings.hideParticipantNames
          ? getAnonymousUserId(roomData, userName)
          : userName;

      this.broadcast({
        type: 'vote',
        user: broadcastUser,
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
      this.resetVotingState(roomData);
      const newPhase = determineRoomPhase(roomData);

      this.broadcast({
        type: 'resetVotes',
      });

      const timerState = ensureTimerState(roomData);
      if (timerState.autoResetOnVotesReset) {
        const now = Date.now();
        const currentSeconds = calculateTimerSeconds(timerState, now);
        timerState.roundAnchorSeconds = currentSeconds;
        this.repository.updateTimerConfig({
          roundAnchorSeconds: currentSeconds,
        });
        this.broadcast({
          type: 'timerUpdated',
          timerState,
        });
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
        !oldEstimateOptions.every(
          (opt, idx) => opt === newEstimateOptions[idx]
        );

      const structuredVotingModeChanged =
        oldStructuredVoting !== newStructuredVoting;

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
        if (
          roomData.structuredVotes &&
          Object.keys(roomData.structuredVotes).length > 0
        ) {
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
        questionMarkCount,
        numericVoteCount: numericVotes.length,
        totalVoteCount,
      };

      this.repository.setJudgeState(result.score, roomData.judgeMetadata);

      this.broadcast({
        type: 'judgeScoreUpdated',
        judgeScore: result.score,
        judgeMetadata: roomData.judgeMetadata,
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
      type: 'strudelPlaybackToggled',
      isPlaying: !!roomData.strudelIsPlaying,
    });
  }

  async handleNextTicket(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (!roomData.settings.enableTicketQueue) {
        return;
      }

      if (
        roomData.moderator !== userName &&
        !roomData.settings.allowOthersToManageQueue
      ) {
        return;
      }

      const currentTicket = roomData.currentTicket;

      const queue = this.getQueueWithPrivacy(roomData);

      this.logVotesForTicket(currentTicket, roomData);

      if (currentTicket && currentTicket.status === 'in_progress') {
        this.repository.updateTicket(currentTicket.id, {
          status: 'completed',
          completedAt: Date.now(),
        });
      }

      let nextTicket: TicketQueueItem | null = this.promoteNextPendingTicket(
        roomData,
        queue
      );

      if (!nextTicket) {
        nextTicket = this.createAutoTicket(roomData, queue);
      }

      this.repository.setCurrentTicket(nextTicket ? nextTicket.id : null);

      this.resetVotingState(roomData);

      const updatedQueue = this.getQueueWithPrivacy(roomData);

      this.broadcast({
        type: 'nextTicket',
        ticket: nextTicket,
        queue: updatedQueue,
      });
    });
  }

  async handleAddTicket(userName: string, ticket: Partial<TicketQueueItem>) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (!roomData.settings.enableTicketQueue) {
        return;
      }

      if (
        roomData.moderator !== userName &&
        !roomData.settings.allowOthersToManageQueue
      ) {
        return;
      }

      const queue = this.repository.getTicketQueue();
      const maxOrdinal = Math.max(0, ...queue.map((t) => t.ordinal));

      const externalServiceForTicket = ticket.externalService ?? 'none';

      const ticketId =
        ticket.ticketId ||
        this.repository.getNextTicketId({
          externalService: externalServiceForTicket,
        });

      if (ticketId) {
        const existingWithKey = this.repository.getTicketByTicketKey(ticketId);
        if (existingWithKey) {
          this.broadcast({
            type: 'error',
            error: `Ticket ${ticketId} already exists in the queue`,
          });
          return;
        }

        const newTicket = this.repository.createTicket({
          ticketId,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status || 'pending',
          ordinal: ticket.ordinal ?? maxOrdinal + 1,
          externalService: externalServiceForTicket,
          externalServiceId: ticket.externalServiceId,
          externalServiceMetadata: ticket.externalServiceMetadata,
        });

        if (newTicket) {
          const updatedQueue = this.repository.getTicketQueue({
            anonymizeVotes:
              roomData.settings.anonymousVotes ||
              roomData.settings.hideParticipantNames,
          });

          this.broadcast({
            type: 'ticketAdded',
            ticket: newTicket,
            queue: updatedQueue,
          });
        }
      }
    });
  }

  async handleUpdateTicket(
    userName: string,
    ticketId: number,
    updates: Partial<TicketQueueItem>
  ) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (!roomData.settings.enableTicketQueue) {
        return;
      }

      if (
        roomData.moderator !== userName &&
        !roomData.settings.allowOthersToManageQueue
      ) {
        return;
      }

      const currentTicket = this.repository.getTicketById(ticketId);
      if (!currentTicket) {
        return;
      }

      if (
        updates.ticketId &&
        updates.ticketId !== currentTicket.ticketId &&
        this.repository.getTicketByTicketKey(updates.ticketId)
      ) {
        this.broadcast({
          type: 'error',
          error: `Ticket ${updates.ticketId} already exists in the queue`,
        });
        return;
      }

      if (updates.ordinal !== undefined) {
        const queue = this.repository.getTicketQueue();
        const conflicting = queue.find(
          (t) => t.id !== ticketId && t.ordinal === updates.ordinal
        );

        if (conflicting) {
          this.repository.updateTicket(conflicting.id, {
            ordinal: currentTicket.ordinal,
          });
        }
      }

      this.repository.updateTicket(ticketId, updates);
      const updatedTicket = this.repository.getTicketById(ticketId, {
        anonymizeVotes:
          roomData.settings.anonymousVotes ||
          roomData.settings.hideParticipantNames,
      });

      if (!updatedTicket) {
        return;
      }

      const updatedQueue = this.repository.getTicketQueue({
        anonymizeVotes:
          roomData.settings.anonymousVotes ||
          roomData.settings.hideParticipantNames,
      });

      this.broadcast({
        type: 'ticketUpdated',
        ticket: updatedTicket,
        queue: updatedQueue,
      });
    });
  }

  async handleDeleteTicket(userName: string, ticketId: number) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (!roomData.settings.enableTicketQueue) {
        return;
      }

      if (
        roomData.moderator !== userName &&
        !roomData.settings.allowOthersToManageQueue
      ) {
        return;
      }

      if (roomData.currentTicket?.id === ticketId) {
        return;
      }

      this.repository.deleteTicket(ticketId);
      const updatedQueue = this.repository.getTicketQueue({
        anonymizeVotes:
          roomData.settings.anonymousVotes ||
          roomData.settings.hideParticipantNames,
      });

      this.broadcast({
        type: 'ticketDeleted',
        ticketId,
        queue: updatedQueue,
      });
    });
  }

  async handleCompleteTicket(userName: string, outcome?: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (!roomData.settings.enableTicketQueue) {
        return;
      }

      if (
        roomData.moderator !== userName &&
        !roomData.settings.allowOthersToManageQueue
      ) {
        return;
      }

      const currentTicket = roomData.currentTicket;
      if (!currentTicket) {
        return;
      }

      this.logVotesForTicket(currentTicket, roomData);

      this.repository.updateTicket(currentTicket.id, {
        status: 'completed',
        outcome,
        completedAt: Date.now(),
      });

      this.resetVotingState(roomData);

      const queueAfterCompletion = this.getQueueWithPrivacy(roomData);
      const nextTicket =
        this.promoteNextPendingTicket(roomData, queueAfterCompletion) || null;

      this.repository.setCurrentTicket(nextTicket ? nextTicket.id : null);

      const updatedQueue = this.getQueueWithPrivacy(roomData);

      this.broadcast({
        type: 'ticketCompleted',
        ticket: nextTicket,
        queue: updatedQueue,
      });
    });
  }

  async handleStartTimer(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (roomData.moderator !== userName) {
        return;
      }

      const timerState = ensureTimerState(roomData);
      if (timerState.running) {
        return;
      }

      const currentTime = Date.now();
      this.repository.startTimer(currentTime);

      timerState.running = true;
      timerState.lastUpdateTime = currentTime;

      this.broadcast({
        type: 'timerStarted',
        timerState,
      });
    });
  }

  async handlePauseTimer(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (roomData.moderator !== userName) {
        return;
      }

      const currentTime = Date.now();
      this.repository.pauseTimer(currentTime);

      const updatedRoomData = await this.getRoomData();
      if (updatedRoomData?.timerState) {
        this.broadcast({
          type: 'timerPaused',
          timerState: updatedRoomData.timerState,
        });
      }
    });
  }

  async handleResetTimer(userName: string) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (roomData.moderator !== userName) {
        return;
      }

      this.repository.resetTimer();

      const timerState = ensureTimerState(roomData);
      timerState.running = false;
      timerState.seconds = 0;
      timerState.lastUpdateTime = 0;
      timerState.roundAnchorSeconds = 0;

      this.broadcast({
        type: 'timerReset',
        timerState,
      });
    });
  }

  async handleConfigureTimer(
    userName: string,
    config: {
      targetDurationSeconds?: number;
      autoResetOnVotesReset?: boolean;
      resetCountdown?: boolean;
    }
  ) {
    await this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.getRoomData();
      if (!roomData) return;

      if (roomData.moderator !== userName) {
        return;
      }

      const timerState = ensureTimerState(roomData);
      const updates: {
        targetDurationSeconds?: number;
        autoResetOnVotesReset?: boolean;
        roundAnchorSeconds?: number;
      } = {};

      if (
        typeof config.targetDurationSeconds === 'number' &&
        !Number.isNaN(config.targetDurationSeconds)
      ) {
        const clamped = Math.max(
          MIN_TIMER_DURATION_SECONDS,
          Math.min(config.targetDurationSeconds, MAX_TIMER_DURATION_SECONDS)
        );
        timerState.targetDurationSeconds = clamped;
        updates.targetDurationSeconds = clamped;
      }

      if (typeof config.autoResetOnVotesReset === 'boolean') {
        timerState.autoResetOnVotesReset = config.autoResetOnVotesReset;
        updates.autoResetOnVotesReset = config.autoResetOnVotesReset;
      }

      if (config.resetCountdown) {
        const now = Date.now();
        const currentSeconds = calculateTimerSeconds(timerState, now);
        timerState.roundAnchorSeconds = currentSeconds;
        updates.roundAnchorSeconds = currentSeconds;
      } else if (timerState.roundAnchorSeconds === undefined) {
        timerState.roundAnchorSeconds = 0;
        updates.roundAnchorSeconds = 0;
      }

      if (Object.keys(updates).length === 0) {
        return;
      }

      this.repository.updateTimerConfig(updates);

      this.broadcast({
        type: 'timerUpdated',
        timerState,
      });
    });
  }

  private shouldAnonymizeVotes(roomData: RoomData): boolean {
    return (
      roomData.settings.anonymousVotes ||
      roomData.settings.hideParticipantNames ||
      false
    );
  }

  private getQueueWithPrivacy(roomData: RoomData): TicketQueueItem[] {
    return this.repository.getTicketQueue({
      anonymizeVotes: this.shouldAnonymizeVotes(roomData),
    });
  }

  private resetVotingState(roomData: RoomData) {
    roomData.votes = {};
    roomData.structuredVotes = {};
    roomData.showVotes = false;
    roomData.judgeScore = null;
    roomData.judgeMetadata = undefined;

    this.repository.clearVotes();
    this.repository.clearStructuredVotes();
    this.repository.setShowVotes(false);
    this.repository.setJudgeState(null);
  }

  private logVotesForTicket(
    ticket: TicketQueueItem | undefined | null,
    roomData: RoomData
  ) {
    if (!ticket || Object.keys(roomData.votes).length === 0) {
      return;
    }

    Object.entries(roomData.votes).forEach(([user, vote]) => {
      this.repository.logTicketVote(
        ticket.id,
        user,
        vote,
        roomData.structuredVotes?.[user]
      );
    });
  }

  private promoteNextPendingTicket(
    roomData: RoomData,
    queue?: TicketQueueItem[]
  ): TicketQueueItem | null {
    const workingQueue = queue ?? this.getQueueWithPrivacy(roomData);
    const pendingTicket = workingQueue.find((t) => t.status === 'pending');

    if (!pendingTicket) {
      return null;
    }

    this.repository.updateTicket(pendingTicket.id, { status: 'in_progress' });
    const refreshed = this.repository.getTicketById(pendingTicket.id, {
      anonymizeVotes: this.shouldAnonymizeVotes(roomData),
    });

    return refreshed ?? null;
  }

  private canAutoCreateTicket(roomData: RoomData): boolean {
    return roomData.settings.externalService === 'none';
  }

  private createAutoTicket(
    roomData: RoomData,
    queue: TicketQueueItem[]
  ): TicketQueueItem | null {
    if (!this.canAutoCreateTicket(roomData)) {
      return null;
    }

    const ticketId = this.repository.getNextTicketId({
      externalService: roomData.settings.externalService || 'none',
    });

    if (!ticketId) {
      return null;
    }

    const maxOrdinal = Math.max(0, ...queue.map((t) => t.ordinal));
    return this.repository.createTicket({
      ticketId,
      status: 'in_progress',
      ordinal: maxOrdinal + 1,
      externalService: roomData.settings.externalService || 'none',
    });
  }

  async getRoomData(): Promise<RoomData | undefined> {
    return this.state.blockConcurrencyWhile(async () => {
      const roomData = await this.repository.getRoomData();
      if (!roomData) {
        return undefined;
      }

      if (
        roomData.currentTicket ||
        !roomData.settings.enableTicketQueue ||
        !this.canAutoCreateTicket(roomData)
      ) {
        return roomData;
      }

      const queue = this.repository.getTicketQueue();
      const nextTicketId = this.repository.getNextTicketId({
        externalService: roomData.settings.externalService || 'none',
      });
      if (!nextTicketId) {
        return roomData;
      }

      const maxOrdinal = Math.max(0, ...queue.map((t) => t.ordinal));

      const existingTicket =
        this.repository.getTicketByTicketKey(nextTicketId) ?? null;
      const created =
        existingTicket ??
        this.repository.createTicket({
          ticketId: nextTicketId,
          status: 'in_progress',
          ordinal: maxOrdinal + 1,
          externalService: roomData.settings.externalService || 'none',
        });

      if (created.status !== 'in_progress') {
        this.repository.updateTicket(created.id, { status: 'in_progress' });
      }

      this.repository.setCurrentTicket(created.id);

      return {
        ...roomData,
        currentTicket: created,
        ticketQueue: this.getQueueWithPrivacy(roomData),
      };
    });
  }

  async putRoomData(roomData: RoomData): Promise<void> {
    await this.repository.replaceRoomData(roomData);
  }
}
