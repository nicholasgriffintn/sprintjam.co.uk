import type { RetroData } from "@sprintjam/types";

import { csvEscape } from "@/utils/csv";

export function buildRetroRecapText(retro: RetroData): string {
  const lines = [
    `Retro recap: ${retro.template.name}`,
    `Key: ${retro.key}`,
    `Participants: ${retro.users.join(", ") || "None"}`,
    "",
    "Cards",
  ];

  for (const column of retro.template.columns) {
    lines.push("", `## ${column.title}`);
    const cards = retro.cards.filter((card) => card.columnId === column.id);
    if (!cards.length) {
      lines.push("- None");
      continue;
    }

    for (const card of cards) {
      const group = card.groupTitle ? ` [Group: ${card.groupTitle}]` : "";
      lines.push(
        `- ${card.text}${group} (${card.votes.length} vote${
          card.votes.length === 1 ? "" : "s"
        })`,
      );
    }
  }

  lines.push("", "Actions");
  if (!retro.actionItems.length) {
    lines.push("- None");
  } else {
    for (const action of retro.actionItems) {
      const owner = action.owner ? `Owner: ${action.owner}` : "Unowned";
      const priority = `Priority: ${action.priority ?? "normal"}`;
      const dueDate = action.dueAt
        ? `Due: ${new Date(action.dueAt).toLocaleDateString()}`
        : "No due date";
      const status = action.completed ? "Done" : "Open";
      lines.push(
        `- ${action.title} (${[status, owner, priority, dueDate].join("; ")})`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function buildRetroRecapCsv(retro: RetroData): string {
  const rows = [
    [
      "type",
      "column",
      "title",
      "owner",
      "priority",
      "due date",
      "status",
      "votes",
      "group",
    ],
  ];

  for (const card of retro.cards) {
    const column = retro.template.columns.find(
      (item) => item.id === card.columnId,
    );
    rows.push([
      "card",
      column?.title ?? card.columnId,
      card.text,
      card.author || "Anonymous",
      "",
      "",
      "",
      String(card.votes.length),
      card.groupTitle ?? "",
    ]);
  }

  for (const action of retro.actionItems) {
    rows.push([
      "action",
      "",
      action.title,
      action.owner ?? "",
      action.priority ?? "normal",
      action.dueAt ? new Date(action.dueAt).toISOString().slice(0, 10) : "",
      action.completed ? "completed" : "open",
      "",
      "",
    ]);
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
