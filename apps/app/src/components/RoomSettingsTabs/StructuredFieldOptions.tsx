import type { VotingCriterion } from "@sprintjam/types";
import {
  STRUCTURED_VOTING_CRITERIA,
  setStructuredVotingCriterionEnabled,
} from "@sprintjam/utils";

import { Switch } from "@/components/ui/Switch";

interface StructuredFieldOptionsProps {
  votingCriteria?: VotingCriterion[];
  onVotingCriteriaChange: (criteria: VotingCriterion[]) => void;
}

export function StructuredFieldOptions({
  votingCriteria = [],
  onVotingCriteriaChange,
}: StructuredFieldOptionsProps) {
  const activeIds = new Set(votingCriteria.map((criterion) => criterion.id));

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-800/50">
      <div className="space-y-3">
        {STRUCTURED_VOTING_CRITERIA.map((criterion) => {
          const isActive = activeIds.has(criterion.id);

          return (
            <div
              key={criterion.id}
              className="flex items-center justify-between gap-4"
            >
              <div>
                <label
                  htmlFor={`structured-field-${criterion.id}`}
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {criterion.name}
                </label>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {criterion.description}
                </p>
              </div>
              <Switch
                id={`structured-field-${criterion.id}`}
                checked={isActive}
                onCheckedChange={(enabled) =>
                  onVotingCriteriaChange(
                    setStructuredVotingCriterionEnabled(
                      votingCriteria,
                      criterion.id,
                      enabled,
                    ),
                  )
                }
                data-testid={`structured-field-${criterion.id}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
