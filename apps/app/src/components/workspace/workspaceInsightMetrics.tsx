import type { ReactNode } from "react";
import {
  AlertTriangle,
  HeartPulse,
  HelpCircle,
  Link2,
  MessageSquare,
  Target,
  Users,
  Zap,
} from "lucide-react";
import type { WorkspaceStandupInsights } from "@sprintjam/types";

import { formatVelocity } from "@/lib/formatters";

export interface WorkspaceInsightMetric {
  label: string;
  value: string;
  icon: ReactNode;
  description: string;
  color: string;
  bgColor: string;
}

interface PlanningInsightSource {
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  participationRate: number;
  questionMarkRate: number;
}

interface PlanningInsightMetricOptions {
  includeParticipation?: boolean;
  discussionDescription: string;
  velocityDescription: string;
  uncertaintyDescription: string;
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

function formatHealth(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}/5`;
}

export function buildPlanningInsightMetrics(
  insights: PlanningInsightSource,
  options: PlanningInsightMetricOptions,
): WorkspaceInsightMetric[] {
  const metrics: WorkspaceInsightMetric[] = [
    {
      label: "First-round consensus",
      value: formatPercentage(insights.firstRoundConsensusRate),
      icon: <Target className="h-4 w-4" />,
      description: "Tickets agreed on first vote",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Discussion rate",
      value: formatPercentage(insights.discussionRate),
      icon: <MessageSquare className="h-4 w-4" />,
      description: options.discussionDescription,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Estimation velocity",
      value: formatVelocity(insights.estimationVelocity),
      icon: <Zap className="h-4 w-4" />,
      description: options.velocityDescription,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
  ];

  if (options.includeParticipation) {
    metrics.push({
      label: "Participation rate",
      value: formatPercentage(insights.participationRate),
      icon: <Users className="h-4 w-4" />,
      description: "Average per round",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    });
  }

  metrics.push({
    label: "Uncertainty rate",
    value: formatPercentage(insights.questionMarkRate),
    icon: <HelpCircle className="h-4 w-4" />,
    description: options.uncertaintyDescription,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  });

  return metrics;
}

export function buildStandupInsightMetrics(
  standup: WorkspaceStandupInsights,
): WorkspaceInsightMetric[] {
  return [
    {
      label: "Standup response",
      value: formatPercentage(standup.responseRate),
      icon: <Users className="h-4 w-4" />,
      description: "Updates submitted",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Average health",
      value: formatHealth(standup.averageHealth),
      icon: <HeartPulse className="h-4 w-4" />,
      description: "Across standup responses",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-900/20",
    },
    {
      label: "Blocker rate",
      value: formatPercentage(standup.blockerRate),
      icon: <AlertTriangle className="h-4 w-4" />,
      description: "Responses with blockers",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Linked tickets",
      value: String(standup.linkedTicketCount),
      icon: <Link2 className="h-4 w-4" />,
      description: "Attached to updates",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    },
  ];
}
