import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import * as schema from "@sprintjam/db/durable-objects/schemas";
import type { DB } from "@sprintjam/db";
import type {
  PasscodeHashPayload,
  RoomSettings,
  StructuredVote,
} from "@sprintjam/types";
import type { TokenCipher } from "@sprintjam/utils";

import migrations from "../../drizzle/migrations";
import { PlanningRoomOAuthStore } from "./planning-room-oauth";
import { PlanningRoomRoomDataStore } from "./planning-room-roomdata";
import { PlanningRoomStateStore } from "./planning-room-state";
import { PlanningRoomTicketStore } from "./planning-room-tickets";

export class PlanningRoomRepository {
  private readonly db: DB;
  private readonly tokenCipher: TokenCipher;
  private readonly anonymousName = "Anonymous";

  constructor(storage: DurableObjectStorage, tokenCipher: TokenCipher) {
    if (!tokenCipher) {
      throw new Error("Token cipher is required");
    }
    this.db = drizzle(storage, { schema });
    this.tokenCipher = tokenCipher;
  }

  async initializeSchema() {
    await migrate(this.db, migrations);
  }

  private get stateStore() {
    return new PlanningRoomStateStore(this.db);
  }

  private get ticketStore() {
    return new PlanningRoomTicketStore(this.db, this.anonymousName);
  }

  private get oauthStore() {
    return new PlanningRoomOAuthStore(this.db, this.tokenCipher);
  }

  private createRoomDataStore() {
    return new PlanningRoomRoomDataStore(this.db, {
      getCurrentTicket: (options) => this.getCurrentTicket(options),
      getTicketQueue: (options) => this.getTicketQueue(options),
    });
  }

  async getRoomData() {
    return this.createRoomDataStore().getRoomData();
  }

  async replaceRoomData(
    roomData: Parameters<PlanningRoomRoomDataStore["replaceRoomData"]>[0],
  ) {
    return this.createRoomDataStore().replaceRoomData(roomData);
  }

  ensureUser(userName: string): string {
    return this.stateStore.ensureUser(userName);
  }

  setUserSpectatorMode(userName: string, isSpectator: boolean) {
    return this.stateStore.setUserSpectatorMode(userName, isSpectator);
  }

  setUserConnection(userName: string, isConnected: boolean) {
    return this.stateStore.setUserConnection(userName, isConnected);
  }

  setUserAvatar(userName: string, avatar?: string) {
    return this.stateStore.setUserAvatar(userName, avatar);
  }

  setModerator(userName: string) {
    return this.stateStore.setModerator(userName);
  }

  setShowVotes(showVotes: boolean) {
    return this.stateStore.setShowVotes(showVotes);
  }

  setRoomStatus(
    status: Parameters<PlanningRoomStateStore["setRoomStatus"]>[0],
  ) {
    return this.stateStore.setRoomStatus(status);
  }

  setRoundHistory(
    history: Parameters<PlanningRoomStateStore["setRoundHistory"]>[0],
  ) {
    return this.stateStore.setRoundHistory(history);
  }

  setTimerState(
    running: Parameters<PlanningRoomStateStore["setTimerState"]>[0],
    seconds: Parameters<PlanningRoomStateStore["setTimerState"]>[1],
    lastUpdateTime: Parameters<PlanningRoomStateStore["setTimerState"]>[2],
  ) {
    return this.stateStore.setTimerState(running, seconds, lastUpdateTime);
  }

  updateTimerConfig(
    config: Parameters<PlanningRoomStateStore["updateTimerConfig"]>[0],
  ) {
    return this.stateStore.updateTimerConfig(config);
  }

  startTimer(currentTime: number) {
    return this.stateStore.startTimer(currentTime);
  }

  pauseTimer(currentTime: number) {
    return this.stateStore.pauseTimer(currentTime);
  }

  resetTimer() {
    return this.stateStore.resetTimer();
  }

  setVote(userName: string, vote: string | number) {
    return this.stateStore.setVote(userName, vote);
  }

  clearVotes() {
    return this.stateStore.clearVotes();
  }

  deleteUserVote(userName: string) {
    return this.stateStore.deleteUserVote(userName);
  }

  setStructuredVote(userName: string, vote: StructuredVote) {
    return this.stateStore.setStructuredVote(userName, vote);
  }

  clearStructuredVotes() {
    return this.stateStore.clearStructuredVotes();
  }

  setJudgeState(
    score: Parameters<PlanningRoomStateStore["setJudgeState"]>[0],
    metadata?: Parameters<PlanningRoomStateStore["setJudgeState"]>[1],
  ) {
    return this.stateStore.setJudgeState(score, metadata);
  }

  setSettings(settings: RoomSettings) {
    return this.stateStore.setSettings(settings);
  }

  setPasscodeHash(passcodeHash: PasscodeHashPayload | null) {
    return this.stateStore.setPasscodeHash(passcodeHash);
  }

  getPasscodeHash() {
    return this.stateStore.getPasscodeHash();
  }

  setSessionToken(userName: string, token: string) {
    return this.stateStore.setSessionToken(userName, token);
  }

  validateSessionToken(userName: string, token: string | null) {
    return this.stateStore.validateSessionToken(userName, token);
  }

  setStrudelState(
    options: Parameters<PlanningRoomStateStore["setStrudelState"]>[0],
  ) {
    return this.stateStore.setStrudelState(options);
  }

  setStrudelPlayback(isPlaying: boolean) {
    return this.stateStore.setStrudelPlayback(isPlaying);
  }

  getCurrentTicket(
    options?: Parameters<PlanningRoomTicketStore["getCurrentTicket"]>[0],
  ) {
    return this.ticketStore.getCurrentTicket(options);
  }

  getTicketById(
    id: number,
    options?: Parameters<PlanningRoomTicketStore["getTicketById"]>[1],
  ) {
    return this.ticketStore.getTicketById(id, options);
  }

  getTicketQueue(
    options?: Parameters<PlanningRoomTicketStore["getTicketQueue"]>[0],
  ) {
    return this.ticketStore.getTicketQueue(options);
  }

  getTicketVotes(
    ticketQueueId: number,
    anonymizeVotes?: Parameters<PlanningRoomTicketStore["getTicketVotes"]>[1],
  ) {
    return this.ticketStore.getTicketVotes(ticketQueueId, anonymizeVotes);
  }

  createTicket(ticket: Parameters<PlanningRoomTicketStore["createTicket"]>[0]) {
    return this.ticketStore.createTicket(ticket);
  }

  updateTicket(
    id: number,
    updates: Parameters<PlanningRoomTicketStore["updateTicket"]>[1],
  ) {
    return this.ticketStore.updateTicket(id, updates);
  }

  deleteTicket(id: number): void {
    this.ticketStore.deleteTicket(id);
  }

  setCurrentTicket(
    ticketId: Parameters<PlanningRoomTicketStore["setCurrentTicket"]>[0],
  ): void {
    this.ticketStore.setCurrentTicket(ticketId);
  }

  getTicketByTicketKey(
    ticketKey: string,
    options?: Parameters<PlanningRoomTicketStore["getTicketByTicketKey"]>[1],
  ) {
    return this.ticketStore.getTicketByTicketKey(ticketKey, options);
  }

  logTicketVote(
    ticketQueueId: number,
    userName: string,
    vote: Parameters<PlanningRoomTicketStore["logTicketVote"]>[2],
    structuredVote?: Parameters<PlanningRoomTicketStore["logTicketVote"]>[3],
  ): void {
    this.ticketStore.logTicketVote(
      ticketQueueId,
      userName,
      vote,
      structuredVote,
    );
  }

  getNextTicketId(
    args: Parameters<PlanningRoomTicketStore["getNextTicketId"]>[0],
  ): string {
    return this.ticketStore.getNextTicketId(args);
  }

  reorderQueue(ticketIds: number[]): void {
    this.ticketStore.reorderQueue(ticketIds);
  }

  async getJiraOAuthCredentials(roomKey: string) {
    return this.oauthStore.getJiraOAuthCredentials(roomKey);
  }

  async saveJiraOAuthCredentials(
    credentials: Parameters<
      PlanningRoomOAuthStore["saveJiraOAuthCredentials"]
    >[0],
  ) {
    return this.oauthStore.saveJiraOAuthCredentials(credentials);
  }

  async updateJiraOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
  ) {
    return this.oauthStore.updateJiraOAuthTokens(
      roomKey,
      accessToken,
      refreshToken,
      expiresAt,
    );
  }

  deleteJiraOAuthCredentials(roomKey: string): void {
    this.oauthStore.deleteJiraOAuthCredentials(roomKey);
  }

  async getLinearOAuthCredentials(roomKey: string) {
    return this.oauthStore.getLinearOAuthCredentials(roomKey);
  }

  async saveLinearOAuthCredentials(
    credentials: Parameters<
      PlanningRoomOAuthStore["saveLinearOAuthCredentials"]
    >[0],
  ) {
    return this.oauthStore.saveLinearOAuthCredentials(credentials);
  }

  async updateLinearOAuthTokens(
    roomKey: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
  ) {
    return this.oauthStore.updateLinearOAuthTokens(
      roomKey,
      accessToken,
      refreshToken,
      expiresAt,
    );
  }

  deleteLinearOAuthCredentials(roomKey: string): void {
    this.oauthStore.deleteLinearOAuthCredentials(roomKey);
  }

  async updateLinearEstimateField(
    roomKey: string,
    estimateField: string | null,
  ) {
    return this.oauthStore.updateLinearEstimateField(roomKey, estimateField);
  }

  async getGithubOAuthCredentials(roomKey: string) {
    return this.oauthStore.getGithubOAuthCredentials(roomKey);
  }

  async saveGithubOAuthCredentials(
    credentials: Parameters<
      PlanningRoomOAuthStore["saveGithubOAuthCredentials"]
    >[0],
  ) {
    return this.oauthStore.saveGithubOAuthCredentials(credentials);
  }

  deleteGithubOAuthCredentials(roomKey: string): void {
    this.oauthStore.deleteGithubOAuthCredentials(roomKey);
  }
}
