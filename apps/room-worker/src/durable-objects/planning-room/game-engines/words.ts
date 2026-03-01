export const ONE_WORD_PITCH_PROMPTS = [
  "New app for dogs",
  "Worst sprint retro ever",
  "Monday deployment surprise",
  "Unexpected stand-up confession",
  "Ticket title from chaos mode",
  "AI pair programmer after coffee",
  "Refactor that touched everything",
  "Bug fix that made three more bugs",
  "Backlog item everyone avoided",
  "Release note nobody wanted to write",
];

export const CATEGORY_BLITZ_CATEGORIES = [
  "Dev tools",
  "Agile ceremonies",
  "Sprint smells",
  "Ticket statuses",
  "Code review phrases",
  "Team rituals",
  "Testing terms",
  "Deployment mishaps",
];

export const CATEGORY_BLITZ_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "F",
  "G",
  "L",
  "M",
  "P",
  "R",
  "S",
  "T",
];

export const SPRINT_WORD_BANK = [
  "AGILE",
  "SPIKE",
  "STORY",
  "SCOPE",
  "MERGE",
  "QUEUE",
  "RETRO",
  "SCRUM",
  "SQUAD",
  "STACK",
  "STAND",
  "GROOM",
  "BUILD",
  "STAGE",
  "CHART",
  "DRAFT",
  "BRIEF",
  "PILOT",
  "TRACK",
  "BENCH",
  "AUDIT",
  "QUERY",
  "PARSE",
  "PATCH",
  "DEBUG",
  "FETCH",
  "CACHE",
  "ROUTE",
  "SCORE",
  "PIVOT",
];

export const TEAM_THREADS_PUZZLES: Array<{
  groups: Array<{
    category: string;
    words: string[];
    difficulty: 1 | 2 | 3 | 4;
  }>;
}> = [
  {
    groups: [
      {
        category: "Scrum ceremonies",
        words: ["STANDUP", "RETRO", "PLANNING", "REVIEW"],
        difficulty: 1,
      },
      {
        category: "Testing types",
        words: ["UNIT", "SMOKE", "LOAD", "E2E"],
        difficulty: 2,
      },
      {
        category: "___ request",
        words: ["PULL", "MERGE", "ACCESS", "CHANGE"],
        difficulty: 3,
      },
      {
        category: "Fibonacci numbers",
        words: ["ONE", "TWO", "THREE", "FIVE"],
        difficulty: 4,
      },
    ],
  },
  {
    groups: [
      {
        category: "Sprint artifacts",
        words: ["BACKLOG", "BURNDOWN", "VELOCITY", "ROADMAP"],
        difficulty: 1,
      },
      {
        category: "Git commands",
        words: ["COMMIT", "PUSH", "FETCH", "REBASE"],
        difficulty: 2,
      },
      {
        category: "Ways to ship",
        words: ["DEPLOY", "RELEASE", "LAUNCH", "ROLLOUT"],
        difficulty: 3,
      },
      {
        category: "___ driven",
        words: ["TEST", "DATA", "DOMAIN", "EVENT"],
        difficulty: 4,
      },
    ],
  },
  {
    groups: [
      {
        category: "Team rituals",
        words: ["STANDUP", "KICKOFF", "DEMO", "SYNC"],
        difficulty: 1,
      },
      {
        category: "Ticket statuses",
        words: ["OPEN", "BLOCKED", "REVIEW", "CLOSED"],
        difficulty: 2,
      },
      {
        category: "Deployment mishaps",
        words: ["ROLLBACK", "HOTFIX", "INCIDENT", "OUTAGE"],
        difficulty: 3,
      },
      {
        category: "Always 'almost done'",
        words: ["DESIGN", "TESTING", "DOCS", "MIGRATION"],
        difficulty: 4,
      },
    ],
  },
  {
    groups: [
      {
        category: "Agile roles",
        words: ["MASTER", "OWNER", "DEVELOPER", "TESTER"],
        difficulty: 1,
      },
      {
        category: "Code review phrases",
        words: ["LGTM", "NITS", "BLOCKING", "APPROVED"],
        difficulty: 2,
      },
      {
        category: "Things in a repo",
        words: ["BRANCH", "TAG", "COMMIT", "HOOK"],
        difficulty: 3,
      },
      {
        category: "Sprint planning poker values",
        words: ["ONE", "THREE", "EIGHT", "INFINITY"],
        difficulty: 4,
      },
    ],
  },
];

export const CLUEBOARD_WORD_BANK = [
  "backlog",
  "burnup",
  "burndown",
  "branch",
  "bug",
  "build",
  "capacity",
  "chore",
  "commit",
  "deploy",
  "design",
  "estimate",
  "epic",
  "feature",
  "fibonacci",
  "grooming",
  "handoff",
  "hotfix",
  "incident",
  "issue",
  "kanban",
  "latency",
  "merge",
  "milestone",
  "planning",
  "points",
  "polling",
  "priority",
  "qa",
  "queue",
  "refactor",
  "release",
  "retro",
  "review",
  "scope",
  "scrum",
  "ship",
  "spike",
  "standup",
  "story",
  "sprint",
  "squad",
  "sync",
  "task",
  "techdebt",
  "testing",
  "ticket",
  "triage",
  "velocity",
  "workflow",
];
