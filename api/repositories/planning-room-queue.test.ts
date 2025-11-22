import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  DurableObjectStorage,
  SqlStorage,
} from "@cloudflare/workers-types";

import { PlanningRoomRepository } from "./planning-room";
import { MockSqlStorage } from "../../tests/helpers/mock-sql-helper";

describe("PlanningRoomRepository - Ticket Queue", () => {
  let repository: PlanningRoomRepository;
  let mockSql: MockSqlStorage;

  beforeEach(() => {
    mockSql = new MockSqlStorage();

    const mockStorage = {
      sql: mockSql as unknown as SqlStorage,
      transactionSync: vi.fn((fn: () => void) => fn()),
      transaction: vi.fn(async (fn: (txn: { sql: SqlStorage }) => void) =>
        fn({ sql: mockSql } as unknown as { sql: SqlStorage }),
      ),
    } as unknown as DurableObjectStorage;

    repository = new PlanningRoomRepository(mockStorage);
    repository.initializeSchema();
  });

  describe("getNextTicketId", () => {
    it("returns SPRINTJAM-001 when no tickets exist", () => {
      const ticketId = repository.getNextTicketId({
        externalService: "none",
      });
      expect(ticketId).toBe("SPRINTJAM-001");
    });

    it("returns empty string for non-SprintJam service when no tickets exist", () => {
      const ticketId = repository.getNextTicketId({
        externalService: "jira",
      });
      expect(ticketId).toBe("");
    });

    it("increments from existing highest ticket", () => {
      repository.createTicket({
        ticketId: "SPRINTJAM-001",
        status: "completed",
        ordinal: 0,
        externalService: "none",
      });

      repository.createTicket({
        ticketId: "SPRINTJAM-005",
        status: "in_progress",
        ordinal: 1,
        externalService: "none",
      });

      const nextId = repository.getNextTicketId({
        externalService: "none",
      });
      expect(nextId).toBe("SPRINTJAM-006");
    });

    it("returns empty string when existing tickets do not match SprintJam pattern", () => {
      repository.createTicket({
        ticketId: "JIRA-123",
        status: "completed",
        ordinal: 0,
        externalService: "jira",
      });

      const nextId = repository.getNextTicketId({
        externalService: "jira",
      });
      expect(nextId).toBe("");
    });
  });

  describe("createTicket", () => {
    it("creates ticket with all required fields", () => {
      const ticket = repository.createTicket({
        ticketId: "SPRINTJAM-001",
        title: "Test Ticket",
        description: "Test description",
        status: "pending",
        ordinal: 0,
        externalService: "none",
      });

      expect(ticket.id).toBe(1);
      expect(ticket.ticketId).toBe("SPRINTJAM-001");
      expect(ticket.title).toBe("Test Ticket");
      expect(ticket.status).toBe("pending");
    });

    it("auto-assigns creation timestamp", () => {
      const before = Date.now();
      const ticket = repository.createTicket({
        ticketId: "SPRINTJAM-002",
        status: "pending",
        ordinal: 0,
        externalService: "none",
      });
      const after = Date.now();

      expect(ticket.createdAt).toBeGreaterThanOrEqual(before);
      expect(ticket.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe("updateTicket", () => {
    it("updates ticket status", () => {
      const ticket = repository.createTicket({
        ticketId: "SPRINTJAM-001",
        status: "pending",
        ordinal: 0,
        externalService: "none",
      });

      repository.updateTicket(ticket.id, {
        status: "completed",
        completedAt: Date.now(),
      });

      const queue = repository.getTicketQueue();
      const updated = queue.find((t) => t.id === ticket.id);

      expect(updated?.status).toBe("completed");
      expect(updated?.completedAt).toBeDefined();
    });
  });

  describe("deleteTicket", () => {
    it("removes ticket from queue", () => {
      const ticket = repository.createTicket({
        ticketId: "SPRINTJAM-001",
        status: "pending",
        ordinal: 0,
        externalService: "none",
      });

      let queue = repository.getTicketQueue();
      expect(queue).toHaveLength(1);

      repository.deleteTicket(ticket.id);

      queue = repository.getTicketQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe("getTicketQueue", () => {
    it("returns all tickets in order", () => {
      repository.createTicket({
        ticketId: "SPRINTJAM-001",
        status: "completed",
        ordinal: 0,
        externalService: "none",
      });

      repository.createTicket({
        ticketId: "SPRINTJAM-002",
        status: "in_progress",
        ordinal: 1,
        externalService: "none",
      });

      repository.createTicket({
        ticketId: "SPRINTJAM-003",
        status: "pending",
        ordinal: 2,
        externalService: "none",
      });

      const queue = repository.getTicketQueue();

      expect(queue).toHaveLength(3);
      expect(queue[0].ticketId).toBe("SPRINTJAM-001");
      expect(queue[1].ticketId).toBe("SPRINTJAM-002");
      expect(queue[2].ticketId).toBe("SPRINTJAM-003");
    });
  });

  describe("getTicketQueue with anonymization", () => {
    it("anonymizes ticket vote authors when anonymousVotes is enabled", () => {
      const queue = repository.getTicketQueue({ anonymizeVotes: true });
      expect(queue).toEqual([]);

      const ticket = repository.createTicket({
        ticketId: "SPRINTJAM-001",
        status: "pending",
        ordinal: 0,
        externalService: "none",
      });
      repository.logTicketVote(ticket.id, "alice", "5");

      const loadedQueue = repository.getTicketQueue({ anonymizeVotes: true });
      expect(loadedQueue).toHaveLength(1);
      const votes = loadedQueue[0].votes ?? [];
      expect(votes).toHaveLength(1);
      expect(votes[0].userName).toBe("Anonymous");
    });
  });
});
