import { desc, eq, inArray, like, sql as sqlOperator } from "drizzle-orm";

import {
  roomMeta,
  ticketQueue,
  ticketVotes,
} from "@sprintjam/db/durable-objects/schemas";
import type { DB, TicketCreateInput } from "@sprintjam/db";
import type {
  StructuredVote,
  TicketQueueWithVotes,
  TicketVote,
  VoteValue,
} from "@sprintjam/types";
import {
  parseVote,
  safeJsonParse,
  serializeJSON,
  serializeVote,
} from "@sprintjam/utils";
import { ROOM_ROW_ID } from "@sprintjam/utils/constants";

export class PlanningRoomTicketStore {
  constructor(
    private readonly db: DB,
    private readonly anonymousName = "Anonymous",
  ) {}

  private mapTicketVoteRow(
    row: typeof ticketVotes.$inferSelect,
    anonymizeVotes?: boolean,
  ): TicketVote {
    const structuredVotePayload = row.structuredVotePayload
      ? safeJsonParse<StructuredVote>(row.structuredVotePayload)
      : undefined;

    return {
      id: row.id,
      ticketQueueId: row.ticketQueueId,
      userName: anonymizeVotes ? this.anonymousName : row.userName,
      vote: parseVote(row.vote),
      structuredVotePayload,
      votedAt: row.votedAt,
    };
  }

  private mapTicketQueueRow(
    row: typeof ticketQueue.$inferSelect,
    votes: TicketVote[],
    options?: { roomKey?: string },
  ): TicketQueueWithVotes {
    return {
      id: row.id,
      roomKey: options?.roomKey ?? "",
      ticketId: row.ticketId,
      title: row.title ?? "",
      description: row.description ?? undefined,
      status: row.status,
      outcome: row.outcome ?? undefined,
      createdAt: row.createdAt,
      completedAt: row.completedAt ?? undefined,
      ordinal: row.ordinal,
      externalService: row.externalService ?? "none",
      externalServiceId: row.externalServiceId ?? undefined,
      externalServiceMetadata: row.externalServiceMetadata ?? undefined,
      votes,
    };
  }

  getCurrentTicket(options?: {
    anonymizeVotes?: boolean;
    roomKey?: string;
  }): TicketQueueWithVotes | undefined {
    const currentTicketId = this.db
      .select({ currentTicketId: roomMeta.currentTicketId })
      .from(roomMeta)
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .get()?.currentTicketId;

    if (!currentTicketId) {
      return undefined;
    }

    return this.getTicketById(currentTicketId, options);
  }

  getTicketById(
    id: number,
    options?: { anonymizeVotes?: boolean; roomKey?: string },
  ): TicketQueueWithVotes | undefined {
    const row = this.db
      .select()
      .from(ticketQueue)
      .where(eq(ticketQueue.id, id))
      .get();

    if (!row) {
      return undefined;
    }

    const votes = this.getTicketVotes(row.id, options?.anonymizeVotes);
    return this.mapTicketQueueRow(row, votes, options);
  }

  getTicketQueue(options?: {
    anonymizeVotes?: boolean;
    roomKey?: string;
  }): TicketQueueWithVotes[] {
    const rows = this.db
      .select()
      .from(ticketQueue)
      .orderBy(ticketQueue.ordinal)
      .all();

    if (rows.length === 0) {
      return [];
    }

    const ticketIds = rows.map((row) => row.id);
    const allVotes = this.db
      .select()
      .from(ticketVotes)
      .where(inArray(ticketVotes.ticketQueueId, ticketIds))
      .orderBy(ticketVotes.votedAt)
      .all();

    const votesByTicket = new Map<number, typeof allVotes>();
    for (const vote of allVotes) {
      const existing = votesByTicket.get(vote.ticketQueueId) ?? [];
      existing.push(vote);
      votesByTicket.set(vote.ticketQueueId, existing);
    }

    return rows.map((row) => {
      const ticketVoteRows = votesByTicket.get(row.id) ?? [];
      const votes = ticketVoteRows.map((voteRow) =>
        this.mapTicketVoteRow(voteRow, options?.anonymizeVotes),
      );

      return this.mapTicketQueueRow(row, votes, options);
    });
  }

  getTicketVotes(
    ticketQueueId: number,
    anonymizeVotes?: boolean,
  ): TicketVote[] {
    const rows = this.db
      .select()
      .from(ticketVotes)
      .where(eq(ticketVotes.ticketQueueId, ticketQueueId))
      .orderBy(ticketVotes.votedAt)
      .all();

    return rows.map((row) => this.mapTicketVoteRow(row, anonymizeVotes));
  }

  createTicket(ticket: TicketCreateInput): TicketQueueWithVotes {
    const [inserted] = this.db
      .insert(ticketQueue)
      .values({
        ticketId: ticket.ticketId,
        title: ticket.title ?? null,
        description: ticket.description ?? null,
        status: ticket.status,
        outcome: ticket.outcome ?? null,
        createdAt: Date.now(),
        completedAt: ticket.completedAt ?? null,
        ordinal: ticket.ordinal,
        externalService: ticket.externalService ?? "none",
        externalServiceId: ticket.externalServiceId ?? null,
        externalServiceMetadata: serializeJSON(
          ticket.externalServiceMetadata ?? null,
        ),
      })
      .returning({ id: ticketQueue.id })
      .all();

    if (!inserted) {
      throw new Error("Failed to create ticket");
    }

    const created = this.getTicketById(inserted.id);
    if (!created) {
      throw new Error("Failed to create ticket");
    }
    return created;
  }

  updateTicket(
    id: number,
    updates: Partial<Omit<TicketQueueWithVotes, "id" | "createdAt" | "votes">>,
  ): void {
    const payload: Partial<typeof ticketQueue.$inferInsert> = {};

    if (updates.ticketId !== undefined) {
      payload.ticketId = updates.ticketId;
    }
    if (updates.title !== undefined) {
      payload.title = updates.title ?? null;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description ?? null;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.outcome !== undefined) {
      payload.outcome = updates.outcome ?? null;
    }
    if (updates.completedAt !== undefined) {
      payload.completedAt = updates.completedAt ?? null;
    }
    if (updates.ordinal !== undefined) {
      payload.ordinal = updates.ordinal;
    }
    if (updates.externalService !== undefined) {
      payload.externalService = updates.externalService;
    }
    if (updates.externalServiceId !== undefined) {
      payload.externalServiceId = updates.externalServiceId ?? null;
    }
    if (updates.externalServiceMetadata !== undefined) {
      payload.externalServiceMetadata = serializeJSON(
        updates.externalServiceMetadata,
      );
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    this.db
      .update(ticketQueue)
      .set(payload)
      .where(eq(ticketQueue.id, id))
      .run();
  }

  deleteTicket(id: number): void {
    this.db.delete(ticketQueue).where(eq(ticketQueue.id, id)).run();
  }

  setCurrentTicket(ticketId: number | null): void {
    this.db
      .update(roomMeta)
      .set({ currentTicketId: ticketId })
      .where(eq(roomMeta.id, ROOM_ROW_ID))
      .run();
  }

  getTicketByTicketKey(
    ticketKey: string,
    options?: { anonymizeVotes?: boolean },
  ): TicketQueueWithVotes | undefined {
    const row = this.db
      .select({ id: ticketQueue.id })
      .from(ticketQueue)
      .where(eq(ticketQueue.ticketId, ticketKey))
      .limit(1)
      .get();

    if (!row) return undefined;
    return this.getTicketById(row.id, options);
  }

  logTicketVote(
    ticketQueueId: number,
    userName: string,
    vote: VoteValue | null,
    structuredVote?: StructuredVote,
  ): void {
    this.db
      .insert(ticketVotes)
      .values({
        ticketQueueId,
        userName,
        vote: serializeVote(vote),
        structuredVotePayload: structuredVote
          ? JSON.stringify(structuredVote)
          : null,
        votedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: [ticketVotes.ticketQueueId, ticketVotes.userName],
        set: {
          vote: serializeVote(vote),
          structuredVotePayload: structuredVote
            ? JSON.stringify(structuredVote)
            : null,
          votedAt: Date.now(),
        },
      })
      .run();
  }

  getNextTicketId({ externalService = "none" }): string {
    const maxTicket = this.db
      .select({ ticketId: ticketQueue.ticketId })
      .from(ticketQueue)
      .where(like(ticketQueue.ticketId, "SPRINTJAM-%"))
      .orderBy(
        desc(sqlOperator`CAST(SUBSTR(${ticketQueue.ticketId}, 11) AS INTEGER)`),
      )
      .limit(1)
      .get();

    if (!maxTicket && externalService === "none") {
      return "SPRINTJAM-001";
    } else if (!maxTicket) {
      return "";
    }

    const ticketKey =
      typeof maxTicket.ticketId === "string"
        ? maxTicket.ticketId
        : String(maxTicket.ticketId ?? "");

    const match = ticketKey.match(/SPRINTJAM-(\d+)/);
    if (!match && externalService === "none") {
      return "SPRINTJAM-001";
    } else if (!match) {
      return "";
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `SPRINTJAM-${String(nextNum).padStart(3, "0")}`;
  }

  reorderQueue(ticketIds: number[]): void {
    ticketIds.forEach((id, index) => {
      this.db
        .update(ticketQueue)
        .set({ ordinal: index })
        .where(eq(ticketQueue.id, id))
        .run();
    });
  }
}
