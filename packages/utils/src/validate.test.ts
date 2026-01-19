import { describe, it, expect } from "vitest";

import { validateClientMessage } from "./validate";

describe("validateClientMessage", () => {
  it("rejects non-object payloads", () => {
    const result = validateClientMessage(null);
    expect(result).toEqual({ error: "Invalid message format" });
  });

  it("validates vote payloads", () => {
    const result = validateClientMessage({ type: "vote", vote: "5" });
    expect(result).toEqual({ type: "vote", vote: "5" });
  });

  it("errors when vote payload missing", () => {
    const result = validateClientMessage({ type: "vote" });
    expect(result).toEqual({ error: "Vote payload missing" });
  });

  it("validates configureTimer with typed fields only", () => {
    const result = validateClientMessage({
      type: "configureTimer",
      config: {
        targetDurationSeconds: 30,
        resetCountdown: true,
        extra: "nope",
      },
    });

    expect(result).toEqual({
      type: "configureTimer",
      config: { targetDurationSeconds: 30, resetCountdown: true },
    });
  });

  it("validates addTicket payload shape", () => {
    const result = validateClientMessage({
      type: "addTicket",
      ticket: { title: "A", status: "pending" },
    });
    expect(result).toEqual({
      type: "addTicket",
      ticket: { title: "A", status: "pending" },
    });
  });

  it("rejects addTicket with title too long", () => {
    const result = validateClientMessage({
      type: "addTicket",
      ticket: { title: "A".repeat(501) },
    });
    expect(result).toEqual({ error: "Ticket title too long (max 500 chars)" });
  });

  it("rejects addTicket with description too long", () => {
    const result = validateClientMessage({
      type: "addTicket",
      ticket: { description: "A".repeat(10001) },
    });
    expect(result).toEqual({
      error: "Ticket description too long (max 10000 chars)",
    });
  });

  it("rejects addTicket with metadata too long", () => {
    const result = validateClientMessage({
      type: "addTicket",
      ticket: { externalServiceMetadata: "A".repeat(10001) },
    });
    expect(result).toEqual({
      error: "Ticket metadata too long (max 10000 chars)",
    });
  });

  it("rejects addTicket with invalid title type", () => {
    const result = validateClientMessage({
      type: "addTicket",
      ticket: { title: 123 },
    });
    expect(result).toEqual({
      error: "Ticket title must be a string or null",
    });
  });

  it("rejects addTicket with invalid description type", () => {
    const result = validateClientMessage({
      type: "addTicket",
      ticket: { description: 123 },
    });
    expect(result).toEqual({
      error: "Ticket description must be a string or null",
    });
  });

  it("validates updateTicket payload shape", () => {
    const result = validateClientMessage({
      type: "updateTicket",
      ticketId: 1,
      updates: { title: "Updated" },
    });
    expect(result).toEqual({
      type: "updateTicket",
      ticketId: 1,
      updates: { title: "Updated" },
    });
  });

  it("rejects updateTicket with title too long", () => {
    const result = validateClientMessage({
      type: "updateTicket",
      ticketId: 1,
      updates: { title: "A".repeat(501) },
    });
    expect(result).toEqual({ error: "Ticket title too long (max 500 chars)" });
  });

  it("rejects updateTicket with description too long", () => {
    const result = validateClientMessage({
      type: "updateTicket",
      ticketId: 1,
      updates: { description: "A".repeat(10001) },
    });
    expect(result).toEqual({
      error: "Ticket description too long (max 10000 chars)",
    });
  });

  it("rejects updateTicket with metadata too long", () => {
    const result = validateClientMessage({
      type: "updateTicket",
      ticketId: 1,
      updates: { externalServiceMetadata: "A".repeat(10001) },
    });
    expect(result).toEqual({
      error: "Ticket metadata too long (max 10000 chars)",
    });
  });

  it("validates selectTicket payload", () => {
    const result = validateClientMessage({
      type: "selectTicket",
      ticketId: 123,
    });
    expect(result).toEqual({
      type: "selectTicket",
      ticketId: 123,
    });
  });

  it("errors when selectTicket payload missing ticketId", () => {
    const result = validateClientMessage({ type: "selectTicket" });
    expect(result).toEqual({ error: "Select ticket payload invalid" });
  });

  it("validates toggleSpectator with true", () => {
    const result = validateClientMessage({
      type: "toggleSpectator",
      isSpectator: true,
    });
    expect(result).toEqual({
      type: "toggleSpectator",
      isSpectator: true,
    });
  });

  it("validates toggleSpectator with false", () => {
    const result = validateClientMessage({
      type: "toggleSpectator",
      isSpectator: false,
    });
    expect(result).toEqual({
      type: "toggleSpectator",
      isSpectator: false,
    });
  });

  it("errors when toggleSpectator payload missing isSpectator", () => {
    const result = validateClientMessage({ type: "toggleSpectator" });
    expect(result).toEqual({ error: "toggleSpectator payload invalid" });
  });

  it("errors when toggleSpectator isSpectator is not boolean", () => {
    const result = validateClientMessage({
      type: "toggleSpectator",
      isSpectator: "true",
    });
    expect(result).toEqual({ error: "toggleSpectator payload invalid" });
  });

  it("validates completeSession", () => {
    const result = validateClientMessage({ type: "completeSession" });
    expect(result).toEqual({ type: "completeSession" });
  });

  it("returns error for unknown message types", () => {
    const result = validateClientMessage({ type: "unknown-op" });
    expect(result).toEqual({ error: "Unknown message type" });
  });
});
