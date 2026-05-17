import type {
  RetroClientMessage,
  RetroPhase,
  RetroSettings,
} from "@sprintjam/types";
import {
  isWorkspaceActionPriority,
  normaliseRetroSettings,
} from "@sprintjam/utils";

const MAX_MESSAGE_CHARS = 10000;
const MAX_CARD_TEXT_CHARS = 1000;
const MAX_ACTION_TEXT_CHARS = 200;
const MIN_TIMER_EXTENSION_SECONDS = 60;
const MAX_TIMER_EXTENSION_SECONDS = 60 * 60;

export function validateRetroMessagePayload(
  raw: string,
): { ok: true; message: RetroClientMessage } | { ok: false; error: string } {
  if (raw.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: "Message too large" };
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid message format" };
  }

  const msg = data as Record<string, unknown>;
  if (typeof msg.type !== "string") {
    return { ok: false, error: "Missing message type" };
  }

  switch (msg.type) {
    case "addCard": {
      const columnId = normaliseText(msg.columnId, 80);
      const text = normaliseText(msg.text, MAX_CARD_TEXT_CHARS);
      if (!columnId || !text) {
        return { ok: false, error: "Card column and text are required" };
      }
      return { ok: true, message: { type: "addCard", columnId, text } };
    }
    case "deleteCard": {
      const cardId = normaliseText(msg.cardId, 80);
      if (!cardId) {
        return { ok: false, error: "Card id is required" };
      }
      return { ok: true, message: { type: "deleteCard", cardId } };
    }
    case "updateCard": {
      const cardId = normaliseText(msg.cardId, 80);
      const text = normaliseText(msg.text, MAX_CARD_TEXT_CHARS);
      if (!cardId || !text) {
        return { ok: false, error: "Card id and text are required" };
      }
      return { ok: true, message: { type: "updateCard", cardId, text } };
    }
    case "moveCard": {
      const cardId = normaliseText(msg.cardId, 80);
      const columnId = normaliseText(msg.columnId, 80);
      if (!cardId || !columnId) {
        return { ok: false, error: "Card id and column are required" };
      }
      return { ok: true, message: { type: "moveCard", cardId, columnId } };
    }
    case "groupCards": {
      const title = normaliseText(msg.title, 120);
      const cardIds = Array.isArray(msg.cardIds)
        ? msg.cardIds.flatMap((cardId) => {
            const normalised = normaliseText(cardId, 80);
            return normalised ? [normalised] : [];
          })
        : [];
      const uniqueCardIds = [...new Set(cardIds)].slice(0, 50);
      if (!title || uniqueCardIds.length < 2) {
        return {
          ok: false,
          error: "Group title and at least two cards are required",
        };
      }
      return {
        ok: true,
        message: { type: "groupCards", title, cardIds: uniqueCardIds },
      };
    }
    case "ungroupCard": {
      const cardId = normaliseText(msg.cardId, 80);
      if (!cardId) {
        return { ok: false, error: "Card id is required" };
      }
      return { ok: true, message: { type: "ungroupCard", cardId } };
    }
    case "voteCard": {
      const cardId = normaliseText(msg.cardId, 80);
      if (!cardId) {
        return { ok: false, error: "Card id is required" };
      }
      return { ok: true, message: { type: "voteCard", cardId } };
    }
    case "setPhase": {
      if (!isRetroPhase(msg.phase)) {
        return { ok: false, error: "Invalid retro phase" };
      }
      return { ok: true, message: { type: "setPhase", phase: msg.phase } };
    }
    case "setReady":
      return {
        ok: true,
        message: { type: "setReady", ready: Boolean(msg.ready) },
      };
    case "addAction": {
      const title = normaliseText(msg.title, MAX_ACTION_TEXT_CHARS);
      const owner = normaliseOptionalText(msg.owner, 100);
      const dueAt = normaliseOptionalTimestamp(msg.dueAt);
      const priority = isWorkspaceActionPriority(msg.priority)
        ? msg.priority
        : undefined;
      if (!title) {
        return { ok: false, error: "Action title is required" };
      }
      return {
        ok: true,
        message: { type: "addAction", title, owner, dueAt, priority },
      };
    }
    case "updateAction": {
      const actionId = normaliseText(msg.actionId, 80);
      if (!actionId) {
        return { ok: false, error: "Action id is required" };
      }
      let title: string | undefined;
      if (msg.title !== undefined) {
        const normalisedTitle = normaliseText(msg.title, MAX_ACTION_TEXT_CHARS);
        if (!normalisedTitle) {
          return { ok: false, error: "Action title is required" };
        }
        title = normalisedTitle;
      }
      const owner =
        msg.owner === null ? null : normaliseOptionalText(msg.owner, 100);
      const dueAt = normaliseOptionalTimestamp(msg.dueAt);
      const priority = isWorkspaceActionPriority(msg.priority)
        ? msg.priority
        : undefined;
      return {
        ok: true,
        message: {
          type: "updateAction",
          actionId,
          title,
          owner,
          dueAt,
          priority,
        },
      };
    }
    case "toggleAction": {
      const actionId = normaliseText(msg.actionId, 80);
      if (!actionId) {
        return { ok: false, error: "Action id is required" };
      }
      return {
        ok: true,
        message: {
          type: "toggleAction",
          actionId,
          completed: Boolean(msg.completed),
        },
      };
    }
    case "startTimer":
      return { ok: true, message: { type: "startTimer" } };
    case "pauseTimer":
      return { ok: true, message: { type: "pauseTimer" } };
    case "resetTimer":
      return { ok: true, message: { type: "resetTimer" } };
    case "configureTimer": {
      if (!msg.config || typeof msg.config !== "object") {
        return { ok: false, error: "Timer config is required" };
      }

      const config = msg.config as Record<string, unknown>;
      const targetDurationSeconds =
        typeof config.targetDurationSeconds === "number"
          ? config.targetDurationSeconds
          : undefined;

      return {
        ok: true,
        message: {
          type: "configureTimer",
          config: {
            targetDurationSeconds,
            resetCountdown: Boolean(config.resetCountdown),
          },
        },
      };
    }
    case "extendTimer": {
      if (typeof msg.seconds !== "number" || !Number.isFinite(msg.seconds)) {
        return { ok: false, error: "Timer extension is required" };
      }

      return {
        ok: true,
        message: {
          type: "extendTimer",
          seconds: Math.max(
            MIN_TIMER_EXTENSION_SECONDS,
            Math.min(msg.seconds, MAX_TIMER_EXTENSION_SECONDS),
          ),
        },
      };
    }
    case "updateSettings":
      if (!msg.settings || typeof msg.settings !== "object") {
        return { ok: false, error: "Settings are required" };
      }
      return {
        ok: true,
        message: {
          type: "updateSettings",
          settings: normaliseRetroSettings(
            undefined,
            msg.settings as Partial<RetroSettings>,
          ),
        },
      };
    case "completeRetro":
      return { ok: true, message: { type: "completeRetro" } };
    case "ping":
      return { ok: true, message: { type: "ping" } };
    default:
      return { ok: false, error: `Unknown message type: ${msg.type}` };
  }
}

function isRetroPhase(value: unknown): value is RetroPhase {
  return (
    value === "input" ||
    value === "review" ||
    value === "focus" ||
    value === "completed"
  );
}

function normaliseText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

function normaliseOptionalText(
  value: unknown,
  maxLength: number,
): string | undefined {
  return normaliseText(value, maxLength) ?? undefined;
}

function normaliseOptionalTimestamp(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.floor(value);
}
