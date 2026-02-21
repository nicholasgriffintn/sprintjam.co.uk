import type {
  ExternalBoardOption,
  ExternalSprintOption,
  TicketMetadata,
} from "@/types";
import {
  fetchGithubIssue,
  fetchGithubMilestones,
  fetchGithubRepoIssues,
  fetchGithubRepos,
} from "@/lib/github-service";
import {
  fetchJiraBoardIssues,
  fetchJiraBoards,
  fetchJiraSprints,
  fetchJiraTicket,
} from "@/lib/jira-service";
import {
  fetchLinearCycles,
  fetchLinearIssue,
  fetchLinearIssues,
  fetchLinearTeams,
} from "@/lib/linear-service";

export type QueueProvider = "jira" | "linear" | "github";

export interface ProviderLabels {
  name: string;
  board: string;
  sprint: string;
  supportsSprint: boolean;
  lookupNoun: string;
  linkNoun: string;
  lookupPlaceholder: string;
  importButtonLabel: string;
  importButtonClassName: string;
  importButtonTestId: string;
}

const PROVIDER_LABELS: Record<QueueProvider, ProviderLabels> = {
  jira: {
    name: "Jira",
    board: "Board",
    sprint: "Sprint",
    supportsSprint: true,
    lookupNoun: "Jira ticket",
    linkNoun: "Jira ticket",
    lookupPlaceholder: "PROJECT-123",
    importButtonLabel: "Add Jira Ticket",
    importButtonClassName:
      "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60",
    importButtonTestId: "queue-add-jira-button",
  },
  linear: {
    name: "Linear",
    board: "Team",
    sprint: "Cycle",
    supportsSprint: true,
    lookupNoun: "Linear issue",
    linkNoun: "Linear issue",
    lookupPlaceholder: "TEAM-123",
    importButtonLabel: "Add Linear Issue",
    importButtonClassName:
      "rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60",
    importButtonTestId: "queue-add-linear-button",
  },
  github: {
    name: "GitHub",
    board: "Repository",
    sprint: "Milestone",
    supportsSprint: true,
    lookupNoun: "GitHub issue",
    linkNoun: "GitHub issue",
    lookupPlaceholder: "owner/repo#123",
    importButtonLabel: "Add GitHub Issue",
    importButtonClassName:
      "rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60",
    importButtonTestId: "queue-add-github-button",
  },
};

const DEFAULT_PROVIDER_LABELS: ProviderLabels = {
  name: "External",
  board: "Board",
  sprint: "Sprint",
  supportsSprint: false,
  lookupNoun: "ticket",
  linkNoun: "ticket",
  lookupPlaceholder: "",
  importButtonLabel: "",
  importButtonClassName: "",
  importButtonTestId: "",
};

export function toQueueProvider(
  externalService: "none" | "jira" | "linear" | "github",
): QueueProvider | null {
  return externalService === "none" ? null : externalService;
}

export function getProviderLabels(provider: QueueProvider | null): ProviderLabels {
  return provider ? PROVIDER_LABELS[provider] : DEFAULT_PROVIDER_LABELS;
}

export async function fetchTicketByProvider(
  provider: QueueProvider,
  key: string,
  roomKey: string,
  userName: string,
): Promise<TicketMetadata> {
  if (provider === "jira") {
    return fetchJiraTicket(key, { roomKey, userName });
  }
  if (provider === "linear") {
    return fetchLinearIssue(key, { roomKey, userName });
  }
  return fetchGithubIssue(key, { roomKey, userName });
}

export async function fetchBoardsByProvider(
  provider: QueueProvider,
  roomKey: string,
  userName: string,
): Promise<ExternalBoardOption[]> {
  if (provider === "jira") {
    const boards = await fetchJiraBoards(roomKey, userName);
    return boards.map((board) => ({
      id: board.id,
      name: board.name,
    }));
  }

  if (provider === "linear") {
    const teams = await fetchLinearTeams(roomKey, userName);
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      key: team.key,
    }));
  }

  const repos = await fetchGithubRepos(roomKey, userName);
  return repos.map((repo) => ({
    id: repo.fullName,
    name: repo.fullName,
    key: repo.name,
  }));
}

export async function fetchSprintsByProvider(
  provider: QueueProvider,
  selectedBoardId: string,
  roomKey: string,
  userName: string,
): Promise<ExternalSprintOption[]> {
  if (provider === "jira") {
    const sprints = await fetchJiraSprints(
      selectedBoardId,
      roomKey,
      userName,
    );
    return sprints.map((sprint) => ({
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate ?? null,
      endDate: sprint.endDate ?? null,
    }));
  }

  if (provider === "linear") {
    const cycles = await fetchLinearCycles(selectedBoardId, roomKey, userName);
    return cycles.map((cycle) => ({
      id: cycle.id,
      name: cycle.name || `Cycle ${cycle.number}`,
      number: cycle.number,
      startDate: cycle.startsAt ?? null,
      endDate: cycle.endsAt ?? null,
    }));
  }

  const milestones = await fetchGithubMilestones(
    selectedBoardId,
    roomKey,
    userName,
  );
  return milestones.map((milestone) => ({
    id: String(milestone.number),
    name: milestone.title,
    number: milestone.number,
    state: milestone.state,
  }));
}

export async function fetchTicketsByProvider(options: {
  provider: QueueProvider;
  selectedBoardId: string;
  selectedSprintId?: string;
  selectedSprint?: ExternalSprintOption;
  ticketLimit?: number | null;
  searchQuery?: string;
  roomKey: string;
  userName: string;
}): Promise<TicketMetadata[]> {
  const {
    provider,
    selectedBoardId,
    selectedSprintId,
    selectedSprint,
    ticketLimit,
    searchQuery,
    roomKey,
    userName,
  } = options;

  if (provider === "jira") {
    return fetchJiraBoardIssues(
      selectedBoardId,
      {
        sprintId: selectedSprintId,
        limit: ticketLimit,
        search: searchQuery || undefined,
      },
      roomKey,
      userName,
    );
  }

  if (provider === "linear") {
    return fetchLinearIssues(
      selectedBoardId,
      {
        cycleId: selectedSprintId,
        limit: ticketLimit,
        search: searchQuery || undefined,
      },
      roomKey,
      userName,
    );
  }

  return fetchGithubRepoIssues(
    selectedBoardId,
    {
      milestoneNumber: selectedSprint?.number ?? null,
      milestoneTitle: selectedSprint?.name ?? null,
      limit: ticketLimit,
      search: searchQuery || undefined,
    },
    roomKey,
    userName,
  );
}
