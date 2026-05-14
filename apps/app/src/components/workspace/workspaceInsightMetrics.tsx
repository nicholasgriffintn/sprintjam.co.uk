import type { ReactNode } from "react";
import {
  AlertTriangle,
  Columns3,
  ListChecks,
  HeartPulse,
  HelpCircle,
  Link2,
  MessageSquare,
  MessageSquareText,
  Repeat2,
  RotateCw,
  Target,
  Trophy,
  Users,
  UserMinus,
  Zap,
} from "lucide-react";
import type {
  WorkspaceRetroInsights,
  WorkspaceStandupInsights,
  WorkspaceWheelInsights,
} from "@sprintjam/types";

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

export function buildWheelInsightMetrics(
  wheel: WorkspaceWheelInsights,
): WorkspaceInsightMetric[] {
  return [
    {
      label: "Wheel spins",
      value: String(wheel.spinCount),
      icon: <RotateCw className="h-4 w-4" />,
      description: "Recorded selections",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      label: "Winner spread",
      value: `${Math.round(wheel.uniqueWinnerRate)}%`,
      icon: <Trophy className="h-4 w-4" />,
      description: "Unique winners per spin",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Repeat winners",
      value: `${Math.round(wheel.repeatWinnerRate)}%`,
      icon: <Repeat2 className="h-4 w-4" />,
      description: "Repeated selections",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Removed after win",
      value: `${Math.round(wheel.removalRate)}%`,
      icon: <UserMinus className="h-4 w-4" />,
      description: "Winners removed",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-900/20",
    },
  ];
}

export function buildRetroInsightMetrics(
  retro: WorkspaceRetroInsights,
): WorkspaceInsightMetric[] {
  return [
    {
      label: "Retro cards",
      value: String(retro.totalCards),
      icon: <Columns3 className="h-4 w-4" />,
      description: "Feedback cards captured",
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      label: "Retro votes",
      value: String(retro.totalVotes),
      icon: <MessageSquareText className="h-4 w-4" />,
      description: "Focus votes cast",
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    {
      label: "Retro actions",
      value: String(retro.totalActions),
      icon: <ListChecks className="h-4 w-4" />,
      description: "Actions created",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Completed actions",
      value: String(retro.completedActions),
      icon: <Target className="h-4 w-4" />,
      description: "Actions marked done",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];
}
