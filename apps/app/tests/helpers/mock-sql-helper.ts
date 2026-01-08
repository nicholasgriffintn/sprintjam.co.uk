export class MockSqlStorage {
  private tables: Map<string, any[]> = new Map();
  private autoIncrements: Map<string, number> = new Map();

  exec<T = any>(query: string, ...params: unknown[]): {
    toArray: () => T[];
    raw: () => { toArray: () => unknown[][] };
    next: () => { value: T | undefined; done: boolean };
  } {
    const upperQuery = query.trim().toUpperCase();
    const normalized = upperQuery.replace(/["`]/g, "");
    const cursor = (rows: T[] = [] as T[]) => {
      let index = 0;
      return {
        toArray: () => rows,
        raw: () => ({
          toArray: () =>
            rows.map((row: any) =>
              Array.isArray(row) ? row : Object.values(row),
            ),
        }),
        next: () => {
          if (index < rows.length) {
            return { value: rows[index++], done: false };
          }
          return { value: undefined, done: true };
        },
      };
    };

    if (normalized.startsWith("CREATE TABLE")) {
      const match = query.match(
        /CREATE TABLE (?:IF NOT EXISTS )?[`"]?(\w+)[`"]?/i,
      );
      if (match) {
        const tableName = match[1];
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
          this.autoIncrements.set(tableName, 1);
        }
      }
      return cursor();
    }

    if (normalized.startsWith("CREATE INDEX") || normalized.startsWith("CREATE UNIQUE INDEX")) {
      return cursor();
    }

    if (normalized.includes("SELECT") && normalized.includes("TICKET_VOTES")) {
      const ticketQueueId = params[0];
      const votes = (this.tables.get("ticket_votes") || []).filter(
        (v: any) => v.ticket_queue_id === ticketQueueId,
      );
      const ordered = votes.sort(
        (a: any, b: any) => (a.voted_at || 0) - (b.voted_at || 0),
      );
      return cursor(ordered as T[]);
    }

    if (normalized.includes("SELECT") && normalized.includes("TICKET_QUEUE")) {
      const tickets = this.tables.get("ticket_queue") || [];
      const singleColumn =
        normalized.match(/^SELECT\s+([A-Z_]+)\s+FROM\s+TICKET_QUEUE/)?.[1]?.toLowerCase();
      const mapRows = (rows: any[]) => {
        if (!singleColumn) {
          return rows as T[];
        }
        return rows.map((row) => [row?.[singleColumn]] as unknown as T);
      };

      if (normalized.includes("TICKET_ID LIKE")) {
        const sprintjamTickets = tickets
          .filter((t: any) => t.ticket_id?.startsWith("SPRINTJAM-"))
          .sort((a: any, b: any) => {
            const aNum = parseInt(a.ticket_id.replace("SPRINTJAM-", ""), 10);
            const bNum = parseInt(b.ticket_id.replace("SPRINTJAM-", ""), 10);
            return bNum - aNum;
          });
        return cursor(
          mapRows(sprintjamTickets.length > 0 ? [sprintjamTickets[0]] : []),
        );
      }

      if (
        normalized.includes("WHERE (ID = ?") ||
        normalized.includes("WHERE ID = ?")
      ) {
        const id = params[0];
        const matchTicket = (tickets as any[]).find((t) => t.id === id);
        return cursor(mapRows(matchTicket ? [matchTicket] : []));
      }

      return cursor(mapRows(tickets));
    }

    if (normalized.startsWith("INSERT INTO TICKET_QUEUE")) {
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

      return cursor([{ id }] as T[]);
    }

    if (normalized.startsWith("INSERT INTO TICKET_VOTES")) {
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

      return cursor();
    }

    if (normalized.startsWith("UPDATE TICKET_QUEUE")) {
      const table = this.tables.get("ticket_queue") || [];
      const id = params[params.length - 1];

      const ticket = (table as any[]).find((t) => t.id === id);
      if (ticket) {
        if (normalized.includes("TICKET_ID")) ticket.ticket_id = params[0];
        if (normalized.includes("TITLE")) ticket.title = params[1] ?? params[0];
        if (normalized.includes("DESCRIPTION"))
          ticket.description = params[2] ?? params[0];
        if (normalized.includes("STATUS")) ticket.status = params[0];
        if (normalized.includes("OUTCOME")) ticket.outcome = params[0];
        if (normalized.includes("COMPLETED_AT"))
          ticket.completed_at = params[1] ?? params[0];
        if (normalized.includes("ORDINAL"))
          ticket.ordinal = params[0] ?? ticket.ordinal;
        if (normalized.includes("EXTERNAL_SERVICE"))
          ticket.external_service = params[0];
        if (normalized.includes("EXTERNAL_SERVICE_ID"))
          ticket.external_service_id = params[0];
        if (normalized.includes("EXTERNAL_SERVICE_METADATA"))
          ticket.external_service_metadata = params[0];
      }

      return cursor();
    }

    if (normalized.startsWith("DELETE FROM TICKET_QUEUE")) {
      const table = this.tables.get("ticket_queue") || [];
      const id = params[0];
      const filtered = (table as any[]).filter((t) => t.id !== id);
      this.tables.set("ticket_queue", filtered);
      return cursor();
    }

    if (normalized.startsWith("DELETE FROM TICKET_VOTES")) {
      const table = this.tables.get("ticket_votes") || [];
      const ticketId = params[0];
      const filtered = (table as any[]).filter(
        (vote) => vote.ticket_queue_id !== ticketId,
      );
      this.tables.set("ticket_votes", filtered);
      return cursor();
    }

    return cursor();
  }
}
