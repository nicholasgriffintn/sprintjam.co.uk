export class MockSqlStorage {
  private tables: Map<string, any[]> = new Map();
  private autoIncrements: Map<string, number> = new Map();

  exec<T = any>(query: string, ...params: unknown[]): { toArray: () => T[] } {
    const upperQuery = query.trim().toUpperCase();

    if (upperQuery.startsWith("CREATE TABLE")) {
      const match = query.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
      if (match) {
        const tableName = match[1];
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
          this.autoIncrements.set(tableName, 1);
        }
      }
      return { toArray: () => [] };
    }

    if (upperQuery.includes("SELECT") && upperQuery.includes("TICKET_VOTES")) {
      const ticketQueueId = params[0];
      const votes = (this.tables.get("ticket_votes") || []).filter(
        (v: any) => v.ticket_queue_id === ticketQueueId,
      );
      return {
        toArray: () =>
          votes.sort((a: any, b: any) => (a.voted_at || 0) - (b.voted_at || 0)),
      };
    }

    if (upperQuery.includes("SELECT") && upperQuery.includes("TICKET_QUEUE")) {
      if (upperQuery.includes("WHERE TICKET_ID LIKE")) {
        const tickets = this.tables.get("ticket_queue") || [];
        const sprintjamTickets = tickets
          .filter((t: any) => t.ticket_id?.startsWith("SPRINTJAM-"))
          .sort((a: any, b: any) => {
            const aNum = parseInt(a.ticket_id.replace("SPRINTJAM-", ""), 10);
            const bNum = parseInt(b.ticket_id.replace("SPRINTJAM-", ""), 10);
            return bNum - aNum;
          });
        return {
          toArray: () =>
            sprintjamTickets.length > 0 ? [sprintjamTickets[0]] : [],
        };
      }
      const tickets = this.tables.get("ticket_queue") || [];
      return { toArray: () => tickets as T[] };
    }

    if (upperQuery.startsWith("INSERT INTO TICKET_QUEUE")) {
      const table = this.tables.get("ticket_queue") || [];
      const id = this.autoIncrements.get("ticket_queue") || 1;

      const ticket = {
        id,
        ticket_id: params[0],
        title: params[1] || null,
        description: params[2] || null,
        status: params[3],
        outcome: params[4] || null,
        created_at: params[5],
        completed_at: params[6] || null,
        ordinal: params[7],
        external_service: params[8] || "none",
        external_service_id: params[9] || null,
        external_service_metadata: params[10] || null,
      };

      table.push(ticket);
      this.tables.set("ticket_queue", table);
      this.autoIncrements.set("ticket_queue", id + 1);

      return { toArray: () => [{ id }] as T[] };
    }

    if (upperQuery.startsWith("INSERT INTO TICKET_VOTES")) {
      const table = this.tables.get("ticket_votes") || [];
      const id = this.autoIncrements.get("ticket_votes") || 1;

      const vote = {
        id,
        ticket_queue_id: params[0],
        user_name: params[1],
        vote: params[2],
        structured_vote_payload: params[3] || null,
        voted_at: params[4],
      };

      const existingIndex = table.findIndex(
        (v: any) =>
          v.ticket_queue_id === vote.ticket_queue_id &&
          v.user_name === vote.user_name,
      );

      if (existingIndex >= 0) {
        table[existingIndex] = vote;
      } else {
        table.push(vote);
        this.autoIncrements.set("ticket_votes", id + 1);
      }

      this.tables.set("ticket_votes", table);

      return { toArray: () => [] };
    }

    if (upperQuery.startsWith("UPDATE TICKET_QUEUE")) {
      const table = this.tables.get("ticket_queue") || [];
      const id = params[params.length - 1];

      const ticket = table.find((t: any) => t.id === id);
      if (ticket) {
        if (upperQuery.includes("STATUS")) ticket.status = params[0];
        if (upperQuery.includes("COMPLETED_AT"))
          ticket.completed_at = params[1] || params[0];
        if (upperQuery.includes("OUTCOME")) ticket.outcome = params[0];
      }

      return { toArray: () => [] };
    }

    if (upperQuery.startsWith("DELETE FROM TICKET_QUEUE")) {
      const table = this.tables.get("ticket_queue") || [];
      const id = params[0];
      const filtered = table.filter((t: any) => t.id !== id);
      this.tables.set("ticket_queue", filtered);
      return { toArray: () => [] };
    }

    return { toArray: () => [] };
  }
}
