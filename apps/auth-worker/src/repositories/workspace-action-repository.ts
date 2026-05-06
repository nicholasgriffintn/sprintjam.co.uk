import { and, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import type { PaginationOptions } from "@sprintjam/utils";
import {
  workspaceActionEvents,
  workspaceActionItems,
  workspaceProcessLoops,
  workspaceSessionLinks,
} from "@sprintjam/db";
import * as schema from "@sprintjam/db/d1/schemas";
import type {
  WorkspaceActionPriority,
  WorkspaceActionSource,
  WorkspaceActionSourceFilter,
  WorkspaceActionStatus,
  WorkspaceActionStatusFilter,
  WorkspaceProcessLoopStatus,
} from "@sprintjam/types";

const workspaceProcessLoopSelection = {
  id: workspaceProcessLoops.id,
  teamId: workspaceProcessLoops.teamId,
  key: workspaceProcessLoops.key,
  name: workspaceProcessLoops.name,
  goal: workspaceProcessLoops.goal,
  status: workspaceProcessLoops.status,
  startsAt: workspaceProcessLoops.startsAt,
  endsAt: workspaceProcessLoops.endsAt,
  createdById: workspaceProcessLoops.createdById,
  createdAt: workspaceProcessLoops.createdAt,
  updatedAt: workspaceProcessLoops.updatedAt,
  completedAt: workspaceProcessLoops.completedAt,
};

const workspaceActionSelection = {
  id: workspaceActionItems.id,
  teamId: workspaceActionItems.teamId,
  processLoopId: workspaceActionItems.processLoopId,
  source: workspaceActionItems.source,
  sourceSessionId: workspaceActionItems.sourceSessionId,
  sourceRef: workspaceActionItems.sourceRef,
  title: workspaceActionItems.title,
  detail: workspaceActionItems.detail,
  status: workspaceActionItems.status,
  priority: workspaceActionItems.priority,
  ownerUserId: workspaceActionItems.ownerUserId,
  ownerName: workspaceActionItems.ownerName,
  dueAt: workspaceActionItems.dueAt,
  externalProvider: workspaceActionItems.externalProvider,
  externalTicketKey: workspaceActionItems.externalTicketKey,
  externalTicketUrl: workspaceActionItems.externalTicketUrl,
  createdById: workspaceActionItems.createdById,
  resolvedById: workspaceActionItems.resolvedById,
  createdAt: workspaceActionItems.createdAt,
  updatedAt: workspaceActionItems.updatedAt,
  resolvedAt: workspaceActionItems.resolvedAt,
  metadata: workspaceActionItems.metadata,
};

const workspaceActionEventSelection = {
  id: workspaceActionEvents.id,
  teamId: workspaceActionEvents.teamId,
  actionId: workspaceActionEvents.actionId,
  actorUserId: workspaceActionEvents.actorUserId,
  eventType: workspaceActionEvents.eventType,
  fromStatus: workspaceActionEvents.fromStatus,
  toStatus: workspaceActionEvents.toStatus,
  note: workspaceActionEvents.note,
  metadata: workspaceActionEvents.metadata,
  createdAt: workspaceActionEvents.createdAt,
};

export class WorkspaceActionRepository {
  private db;

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema });
  }

  async listProcessLoops(teamId: number) {
    return await this.db
      .select(workspaceProcessLoopSelection)
      .from(workspaceProcessLoops)
      .where(eq(workspaceProcessLoops.teamId, teamId))
      .orderBy(
        desc(workspaceProcessLoops.startsAt),
        desc(workspaceProcessLoops.createdAt),
      );
  }

  async createProcessLoop(params: {
    teamId: number;
    key: string;
    name: string;
    goal?: string | null;
    status?: WorkspaceProcessLoopStatus;
    startsAt?: number | null;
    endsAt?: number | null;
    createdById: number;
  }): Promise<number> {
    const now = Date.now();
    const result = await this.db
      .insert(workspaceProcessLoops)
      .values({
        teamId: params.teamId,
        key: params.key,
        name: params.name,
        goal: params.goal ?? null,
        status: params.status ?? "active",
        startsAt: params.startsAt ?? null,
        endsAt: params.endsAt ?? null,
        createdById: params.createdById,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: workspaceProcessLoops.id });

    return result[0].id;
  }

  async getProcessLoopById(processLoopId: number) {
    return await this.db
      .select(workspaceProcessLoopSelection)
      .from(workspaceProcessLoops)
      .where(eq(workspaceProcessLoops.id, processLoopId))
      .get();
  }

  async getOrCreateProcessLoop(params: {
    teamId: number;
    key: string;
    name: string;
    goal?: string | null;
    status?: WorkspaceProcessLoopStatus;
    startsAt?: number | null;
    endsAt?: number | null;
    createdById: number;
  }) {
    const existing = await this.db
      .select(workspaceProcessLoopSelection)
      .from(workspaceProcessLoops)
      .where(
        and(
          eq(workspaceProcessLoops.teamId, params.teamId),
          eq(workspaceProcessLoops.key, params.key),
        ),
      )
      .get();

    if (existing) {
      return existing;
    }

    const id = await this.createProcessLoop(params);
    const created = await this.getProcessLoopById(id);
    if (!created) {
      throw new Error("Workspace process loop was not created");
    }
    return created;
  }

  async linkSessionToProcessLoop(params: {
    teamId: number;
    processLoopId: number;
    sessionId: number;
    linkedById: number;
  }): Promise<void> {
    const now = Date.now();
    await this.db
      .insert(workspaceSessionLinks)
      .values({
        teamId: params.teamId,
        processLoopId: params.processLoopId,
        sessionId: params.sessionId,
        linkedById: params.linkedById,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: workspaceSessionLinks.sessionId,
        set: {
          processLoopId: params.processLoopId,
          linkedById: params.linkedById,
          createdAt: now,
        },
      });
  }

  async getProcessLoopForSession(sessionId: number) {
    return await this.db
      .select(workspaceProcessLoopSelection)
      .from(workspaceSessionLinks)
      .innerJoin(
        workspaceProcessLoops,
        eq(workspaceSessionLinks.processLoopId, workspaceProcessLoops.id),
      )
      .where(eq(workspaceSessionLinks.sessionId, sessionId))
      .get();
  }

  async listActions(
    teamId: number,
    pagination?: PaginationOptions,
    filters: {
      status?: WorkspaceActionStatusFilter;
      source?: WorkspaceActionSourceFilter;
      processLoopId?: number;
    } = {},
  ) {
    const conditions = [eq(workspaceActionItems.teamId, teamId)];
    if (filters.status && filters.status !== "all") {
      conditions.push(eq(workspaceActionItems.status, filters.status));
    }
    if (filters.source && filters.source !== "all") {
      conditions.push(eq(workspaceActionItems.source, filters.source));
    }
    if (filters.processLoopId !== undefined) {
      conditions.push(
        eq(workspaceActionItems.processLoopId, filters.processLoopId),
      );
    }

    const query = this.db
      .select(workspaceActionSelection)
      .from(workspaceActionItems)
      .where(and(...conditions))
      .orderBy(
        desc(workspaceActionItems.updatedAt),
        desc(workspaceActionItems.createdAt),
      );

    if (!pagination) {
      return await query;
    }

    return await query.limit(pagination.limit).offset(pagination.offset);
  }

  async countActions(
    teamId: number,
    status: WorkspaceActionStatusFilter = "all",
    filters: {
      source?: WorkspaceActionSourceFilter;
      processLoopId?: number;
    } = {},
  ): Promise<number> {
    const conditions = [eq(workspaceActionItems.teamId, teamId)];
    if (status !== "all") {
      conditions.push(eq(workspaceActionItems.status, status));
    }
    if (filters.source && filters.source !== "all") {
      conditions.push(eq(workspaceActionItems.source, filters.source));
    }
    if (filters.processLoopId !== undefined) {
      conditions.push(
        eq(workspaceActionItems.processLoopId, filters.processLoopId),
      );
    }

    const result = await this.db
      .select({ value: count() })
      .from(workspaceActionItems)
      .where(and(...conditions));

    return result[0]?.value ?? 0;
  }

  async getActionCounts(
    teamId: number,
    filters: {
      source?: WorkspaceActionSourceFilter;
      processLoopId?: number;
    } = {},
  ) {
    const [all, open, inProgress, resolved, dismissed] = await Promise.all([
      this.countActions(teamId, "all", filters),
      this.countActions(teamId, "open", filters),
      this.countActions(teamId, "in_progress", filters),
      this.countActions(teamId, "resolved", filters),
      this.countActions(teamId, "dismissed", filters),
    ]);

    return {
      all,
      open,
      in_progress: inProgress,
      resolved,
      dismissed,
    };
  }

  async getActionById(actionId: number) {
    return await this.db
      .select(workspaceActionSelection)
      .from(workspaceActionItems)
      .where(eq(workspaceActionItems.id, actionId))
      .get();
  }

  async upsertAction(params: {
    teamId: number;
    processLoopId?: number | null;
    source: WorkspaceActionSource;
    sourceSessionId?: number | null;
    sourceRef: string;
    title: string;
    detail?: string | null;
    status?: WorkspaceActionStatus;
    priority?: WorkspaceActionPriority;
    ownerUserId?: number | null;
    ownerName?: string | null;
    dueAt?: number | null;
    externalProvider?: string | null;
    externalTicketKey?: string | null;
    externalTicketUrl?: string | null;
    createdById: number;
    resolvedById?: number | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<number> {
    const now = Date.now();
    const resolvedAt =
      params.status === "resolved" || params.status === "dismissed"
        ? now
        : null;
    const values = {
      teamId: params.teamId,
      processLoopId: params.processLoopId ?? null,
      source: params.source,
      sourceSessionId: params.sourceSessionId ?? null,
      sourceRef: params.sourceRef,
      title: params.title,
      detail: params.detail ?? null,
      status: params.status ?? "open",
      priority: params.priority ?? "normal",
      ownerUserId: params.ownerUserId ?? null,
      ownerName: params.ownerName ?? null,
      dueAt: params.dueAt ?? null,
      externalProvider: params.externalProvider ?? null,
      externalTicketKey: params.externalTicketKey ?? null,
      externalTicketUrl: params.externalTicketUrl ?? null,
      createdById: params.createdById,
      resolvedById: params.resolvedById ?? null,
      createdAt: now,
      updatedAt: now,
      resolvedAt,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    };
    const updates = {
      processLoopId: values.processLoopId,
      title: values.title,
      detail: values.detail,
      priority: values.priority,
      ownerUserId: values.ownerUserId,
      ownerName: values.ownerName,
      dueAt: values.dueAt,
      externalProvider: values.externalProvider,
      externalTicketKey: values.externalTicketKey,
      externalTicketUrl: values.externalTicketUrl,
      updatedAt: now,
      metadata: values.metadata,
      ...(params.status === undefined
        ? {}
        : {
            status: values.status,
            resolvedById: values.resolvedById,
            resolvedAt,
          }),
    };

    const result = await this.db
      .insert(workspaceActionItems)
      .values(values)
      .onConflictDoUpdate({
        target: [
          workspaceActionItems.teamId,
          workspaceActionItems.source,
          workspaceActionItems.sourceSessionId,
          workspaceActionItems.sourceRef,
        ],
        set: updates,
      })
      .returning({ id: workspaceActionItems.id });

    const actionId = result[0].id;
    await this.createActionEvent({
      teamId: params.teamId,
      actionId,
      actorUserId: params.createdById,
      eventType: "created",
    });
    return actionId;
  }

  async updateAction(
    actionId: number,
    updates: {
      processLoopId?: number | null;
      title?: string;
      detail?: string | null;
      status?: WorkspaceActionStatus;
      priority?: WorkspaceActionPriority;
      ownerUserId?: number | null;
      ownerName?: string | null;
      dueAt?: number | null;
      externalProvider?: string | null;
      externalTicketKey?: string | null;
      externalTicketUrl?: string | null;
      resolvedById?: number | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    const nextStatus = updates.status;
    await this.db
      .update(workspaceActionItems)
      .set({
        ...updates,
        metadata:
          updates.metadata === undefined
            ? undefined
            : updates.metadata
              ? JSON.stringify(updates.metadata)
              : null,
        updatedAt: Date.now(),
        resolvedAt:
          nextStatus === "resolved" || nextStatus === "dismissed"
            ? Date.now()
            : nextStatus
              ? null
              : undefined,
      })
      .where(eq(workspaceActionItems.id, actionId));
  }

  async createActionEvent(params: {
    teamId: number;
    actionId: number;
    actorUserId?: number | null;
    eventType: "created" | "updated" | "status_changed" | "commented";
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<number> {
    const result = await this.db
      .insert(workspaceActionEvents)
      .values({
        teamId: params.teamId,
        actionId: params.actionId,
        actorUserId: params.actorUserId ?? null,
        eventType: params.eventType,
        fromStatus: params.fromStatus ?? null,
        toStatus: params.toStatus ?? null,
        note: params.note ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        createdAt: Date.now(),
      })
      .returning({ id: workspaceActionEvents.id });

    return result[0].id;
  }

  async listActionEvents(actionId: number) {
    return await this.db
      .select(workspaceActionEventSelection)
      .from(workspaceActionEvents)
      .where(eq(workspaceActionEvents.actionId, actionId))
      .orderBy(desc(workspaceActionEvents.createdAt));
  }
}
