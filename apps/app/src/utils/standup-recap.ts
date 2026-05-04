import type { StandupData, StandupResponse } from "@sprintjam/types";

import { csvEscape } from "@/utils/csv";

const formatTicketList = (response: StandupResponse) =>
  response.linkedTickets?.map((ticket) => ticket.key).join(", ") ?? "";

interface StandupBlockerFollowUpOptions {
  resolvedBlockers?: ReadonlySet<string>;
}

export function buildStandupBlockerFollowUpText(
  standupData: StandupData,
  options: StandupBlockerFollowUpOptions = {},
) {
  const blockers = standupData.responses.filter(
    (response) =>
      response.hasBlocker && !options.resolvedBlockers?.has(response.userName),
  );

  if (blockers.length === 0) {
    return standupData.responses.some((response) => response.hasBlocker)
      ? "No unresolved blockers."
      : "No blockers flagged.";
  }

  return blockers
    .map((response) => {
      const tickets = formatTicketList(response);
      const suffix = tickets ? ` (${tickets})` : "";
      return `- ${response.userName}${suffix}: ${response.blockerDescription ?? "Needs follow-up"}`;
    })
    .join("\n");
}

export function buildStandupRecapText(standupData: StandupData) {
  const submitted = `${standupData.respondedUsers.length}/${standupData.users.length}`;
  const blockers = buildStandupBlockerFollowUpText(standupData);

  const responses = standupData.responses
    .map((response) => {
      const tickets = formatTicketList(response);
      return [
        `${response.userName}`,
        `Health: ${response.isHealthCheckPrivate ? "Private" : `${response.healthCheck}/5`}`,
        `Blocker: ${response.hasBlocker ? (response.blockerDescription ?? "Needs follow-up") : "No"}`,
        tickets ? `Tickets: ${tickets}` : null,
        response.kudos ? `Kudos: ${response.kudos}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");

  return [
    `Standup ${standupData.key}`,
    `Submitted: ${submitted}`,
    "",
    "Blockers",
    blockers,
    "",
    "Responses",
    responses || "No responses yet.",
  ].join("\n");
}

export function buildStandupRecapCsv(standupData: StandupData) {
  const rows = [
    [
      "User",
      "Attendance",
      "Yesterday",
      "Today",
      "Health",
      "Health private",
      "Has blocker",
      "Blocker resolved",
      "Blocker",
      "Linked tickets",
      "Kudos",
      "Icebreaker",
    ],
    ...standupData.responses.map((response) => [
      response.userName,
      response.isInPerson ? "Attending" : "Not attending",
      response.yesterday ?? "",
      response.today ?? "",
      response.healthCheck,
      response.isHealthCheckPrivate ? "Yes" : "No",
      response.hasBlocker ? "Yes" : "No",
      response.blockerResolved ? "Yes" : "No",
      response.blockerDescription ?? "",
      formatTicketList(response),
      response.kudos ?? "",
      response.icebreakerAnswer ?? "",
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function getOrderedStandupResponses(standupData: StandupData) {
  const userOrder = new Map(
    standupData.users.map((user, index) => [user, index]),
  );
  const presentationOrder = standupData.presentationOrder;

  if (presentationOrder?.length) {
    const orderMap = new Map(
      presentationOrder.map((name, index) => [name, index]),
    );
    return [...standupData.responses].sort(
      (left, right) =>
        (orderMap.get(left.userName) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(right.userName) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  return [...standupData.responses].sort(
    (left, right) =>
      (userOrder.get(left.userName) ?? Number.MAX_SAFE_INTEGER) -
      (userOrder.get(right.userName) ?? Number.MAX_SAFE_INTEGER),
  );
}
