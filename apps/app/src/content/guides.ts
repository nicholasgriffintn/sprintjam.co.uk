export interface GuideInfo {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  category: "fundamentals" | "facilitation" | "techniques" | "tools";
  featured?: boolean;
}

export const guides: GuideInfo[] = [
  {
    slug: "planning-poker",
    title: "What is Planning Poker?",
    description:
      "Learn the fundamentals of Planning Poker, why simultaneous voting reduces bias, and how teams use it to estimate work effectively.",
    readTime: "5 min",
    category: "fundamentals",
    featured: true,
  },
  {
    slug: "fibonacci-scale",
    title: "Understanding the Fibonacci Scale",
    description:
      "Why agile teams use Fibonacci numbers for estimation, how the growing gaps acknowledge uncertainty, and when to use alternatives.",
    readTime: "4 min",
    category: "fundamentals",
    featured: true,
  },
  {
    slug: "sprint-planning",
    title: "Estimation in Sprint Planning",
    description:
      "Where estimation fits in Scrum ceremonies, preparing your backlog, and balancing refinement with planning.",
    readTime: "6 min",
    category: "techniques",
  },
  {
    slug: "structured-voting",
    title: "Structured Voting Explained",
    description:
      "When to use weighted multi-factor scoring instead of single-number estimates. Complexity, confidence, volume, and unknowns.",
    readTime: "4 min",
    category: "techniques",
  },
  {
    slug: "fibonacci-short",
    title: "Fibonacci Short Scale",
    description:
      "A tighter Fibonacci deck for faster sprint planning: 1, 2, 3, 5, 8, 13, 21.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "doubling-scale",
    title: "Doubling Scale Cards",
    description:
      "A coarse 2, 4, 8, 16, 32 scale for high uncertainty and quick alignment.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "tshirt-sizing",
    title: "T-Shirt Sizing Cards",
    description:
      "XS to XL sizing for early discovery, roadmaps, and fast grouping.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "planet-scale",
    title: "Planet Scale Cards",
    description:
      "A playful scale from Moon to Pluto for quick, relative sizing.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "yes-no",
    title: "Yes/No Cards",
    description: "Binary decisions for readiness checks and go/no-go calls.",
    readTime: "2 min",
    category: "techniques",
  },
  {
    slug: "simple-scale",
    title: "Simple 1-8 Cards",
    description:
      "A straight 1-8 scale for teams that want a linear starting point.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "hours-estimates",
    title: "Hours Cards",
    description:
      "Time-based estimates for operational work and short-term scheduling.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "session-roles",
    title: "Estimation Session Roles",
    description:
      "Define clear roles for your estimation sessions: Facilitator, Scribe, Timekeeper, and participants. Keep sessions focused and productive.",
    readTime: "6 min",
    category: "facilitation",
    featured: true,
  },
  {
    slug: "remote-estimation",
    title: "Running Remote Estimation Sessions",
    description:
      "Best practices for distributed teams: async preparation, time zone considerations, and keeping remote participants engaged.",
    readTime: "7 min",
    category: "facilitation",
  },
  {
    slug: "story-points",
    title: "Story Points vs Hours",
    description:
      "Understand why relative estimation beats time-based estimates, how to calibrate your team, and avoid the hours trap.",
    readTime: "5 min",
    category: "fundamentals",
  },
  {
    slug: "consensus-building",
    title: "Handling Disagreement and Building Consensus",
    description:
      "Turn vote spread into productive discussion. Techniques for surfacing assumptions and reaching agreement.",
    readTime: "5 min",
    category: "facilitation",
  },
];
