import { Award, Lightbulb, TrendingUp, Users } from "lucide-react";
import type {
  WorkspaceInsights,
  WorkspaceInsightsContributor,
} from "@sprintjam/types";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SuggestedFocusCards } from "@/components/workspace/SuggestedFocusCards";
import { buildInsightPrompts } from "@/utils/workspace-insight-prompts";

interface WorkspaceInsightWidgetsProps {
  insights: WorkspaceInsights | null;
}

function TopContributorRow({
  contributor,
  index,
}: {
  contributor: WorkspaceInsightsContributor;
  index: number;
}) {
  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          {index + 1}
        </span>
        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
          {contributor.userName}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 sm:justify-end">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {contributor.totalVotes} votes
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {Math.round(contributor.consensusAlignment)}% aligned
        </span>
      </div>
    </div>
  );
}

export function WorkspaceInsightWidgets({
  insights,
}: WorkspaceInsightWidgetsProps) {
  if (!insights) {
    return null;
  }

  const insightPrompts = buildInsightPrompts(insights);
  const topContributors = insights.topContributors.slice(0, 5);
  const widgetCount =
    Number(insightPrompts.length > 0) + Number(topContributors.length > 0);

  if (widgetCount === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {insightPrompts.length > 0 ? (
        <SurfaceCard className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Suggested focus
            </h3>
          </div>
          <SuggestedFocusCards prompts={insightPrompts} />
        </SurfaceCard>
      ) : null}

      {topContributors.length > 0 ? (
        <SurfaceCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Top contributors
              </h3>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {insights.topContributors.length} participants
            </span>
          </div>
          <div className="space-y-2">
            {topContributors.map((contributor, index) => (
              <TopContributorRow
                key={contributor.userName}
                contributor={contributor}
                index={index}
              />
            ))}
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
