import { motion } from "framer-motion";
import { useState, useEffect, useId } from "react";
import { Info } from "lucide-react";

import type {
  VotingCriterion,
  StructuredVote,
  StructuredVotingDisplaySettings,
} from "@/types";
import { StructuredVotingUpdateNotification } from "./StructuredVotingUpdateNotification";
import { TimerChip } from "./TimerChip";
import { useRoomState } from "@/context/RoomContext";
import { Button } from "@/components/ui/Button";

const MotionButton = motion(Button);

interface StructuredVotingPanelProps {
  criteria: VotingCriterion[];
  currentVote: StructuredVote | null;
  onVote: (vote: StructuredVote) => void;
  displaySettings?: StructuredVotingDisplaySettings;
}

interface CriterionRowProps {
  criterion: VotingCriterion;
  score: number | null;
  onScoreChange: (score: number) => void;
  isDisabled?: boolean;
}

function CriterionRow({ criterion, score, onScoreChange, isDisabled }: CriterionRowProps) {
  const scoreButtons = [];

  for (let i = criterion.minScore; i <= criterion.maxScore; i++) {
    scoreButtons.push(
      <MotionButton
        key={i}
        type="button"
        variant="unstyled"
        onClick={() => onScoreChange(i)}
        disabled={isDisabled}
        data-testid={`structured-score-${criterion.id}-${i}`}
        className={`h-8 w-8 rounded border text-sm font-semibold ${
          isDisabled
            ? "opacity-50 cursor-not-allowed"
            : score === i
              ? "border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
        }`}
        whileHover={isDisabled ? {} : { scale: 1.05 }}
        whileTap={isDisabled ? {} : { scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        aria-pressed={score === i}
        aria-label={`Set ${criterion.name} to ${i}`}
      >
        {i}
      </MotionButton>,
    );
  }

  return (
    <div
      className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
      data-testid={`structured-criterion-${criterion.id}`}
    >
      <div className="flex-1">
        <div className="font-medium text-slate-900 dark:text-white">
          {criterion.name}
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-200">
          {criterion.description}
        </div>
      </div>
      <div className="flex gap-1 ml-4">{scoreButtons}</div>
    </div>
  );
}

export function StructuredVotingPanel({
  criteria,
  currentVote,
  onVote,
  displaySettings,
}: StructuredVotingPanelProps) {
  const { roomData } = useRoomState();
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(
    () => {
      if (currentVote?.criteriaScores) {
        return { ...currentVote.criteriaScores };
      }
      return {};
    },
  );

  const [showScoringInfo, setShowScoringInfo] = useState(false);
  const infoToggleSettings = displaySettings?.infoToggle;
  const allowScoringInfoToggle = infoToggleSettings?.enabled ?? true;
  const scoringInfoPanelId = useId();

  const isVotingDisabled =
    roomData?.showVotes &&
    !roomData?.settings.allowVotingAfterReveal &&
    !roomData?.settings.alwaysRevealVotes;

  useEffect(() => {
    if (!currentVote) {
      setCriteriaScores({});
    }
  }, [currentVote]);

  useEffect(() => {
    if (!allowScoringInfoToggle) {
      setShowScoringInfo(false);
    }
  }, [allowScoringInfoToggle]);

  const calculatedVote = currentVote;
  const hasAnyScores = Object.keys(criteriaScores).length > 0;

  const handleScoreChange = (criterionId: string, score: number) => {
    const newScores = { ...criteriaScores, [criterionId]: score };
    setCriteriaScores(newScores);

    onVote({ criteriaScores: newScores });
  };

  return (
    <>
      <StructuredVotingUpdateNotification />
      <div
        className="mb-6 text-slate-900 dark:text-white"
        data-testid="structured-voting-panel"
      >
        {roomData?.currentTicket && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Currently Voting On
              </span>
              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                {roomData.currentTicket.ticketId}
              </span>
            </div>
            {roomData.currentTicket.title && (
              <p className="text-base font-medium text-slate-800 dark:text-slate-100">
                {roomData.currentTicket.title}
              </p>
            )}
            {roomData.currentTicket.description && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {roomData.currentTicket.description}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {displaySettings?.panelTitle ?? 'Structured Estimation'}
          </h2>
          <div className="flex items-center gap-3">
            {allowScoringInfoToggle && (
              <Button
                type="button"
                variant="unstyled"
                onClick={() => setShowScoringInfo(!showScoringInfo)}
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  showScoringInfo
                    ? 'text-slate-900 border border-slate-300 bg-white/80 hover:border-slate-400 dark:border-slate-600 dark:bg-white/10 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-transparent'
                }`}
                aria-expanded={showScoringInfo}
                aria-controls={scoringInfoPanelId}
              >
                <Info size={14} />
                {infoToggleSettings?.label ?? 'Scoring Info'}
              </Button>
            )}
            {roomData?.settings.showTimer && <TimerChip />}
          </div>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/55 border border-white/50 dark:border-white/5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl rounded-3xl p-3 mb-4">
          {criteria.map((criterion) => (
            <CriterionRow
              key={criterion.id}
              criterion={criterion}
              score={criteriaScores[criterion.id] ?? null}
              onScoreChange={(score) => handleScoreChange(criterion.id, score)}
              isDisabled={isVotingDisabled}
            />
          ))}
        </div>

        {allowScoringInfoToggle &&
          showScoringInfo &&
          (calculatedVote || hasAnyScores) && (
            <div
              id={scoringInfoPanelId}
              className="mb-4 p-3 bg-white/85 dark:bg-slate-900/55 border border-white/50 dark:border-white/5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl rounded-3xl"
              role="region"
              aria-live="polite"
            >
              <div className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-3">
                {infoToggleSettings?.title ?? 'Weighted Scoring System'}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-200 space-y-2">
                {(infoToggleSettings?.showContributionDetails ?? true) && (
                  <div className="grid grid-cols-1 gap-1">
                    {(calculatedVote?.contributions || []).map((c) => {
                      const criterionName =
                        criteria.find((k) => k.id === c.id)?.name || c.id;
                      return (
                        <div
                          key={c.id}
                          className="flex justify-between items-center"
                        >
                          <span className="font-medium">{criterionName}:</span>
                          <span className="text-right">
                            {c.score}/{c.maxScore} ×{' '}
                            {c.weightPercent.toFixed(0)}% ={' '}
                            {c.contributionPercent.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total Score:</span>
                    <span>
                      {(calculatedVote?.percentageScore ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                {(infoToggleSettings?.showRangeDetails ?? true) && (
                  <div className="mt-3 text-xs">
                    <div className="font-medium mb-1">
                      {infoToggleSettings?.rangesLabel ?? 'Story Point Ranges:'}
                    </div>
                    <div className="space-y-0.5">
                      <div>
                        {infoToggleSettings?.rangesDescription ??
                          '1pt: 0-34% | 3pt: 35-49% | 5pt: 50-79% | 8pt: 80%+'}
                      </div>
                    </div>
                  </div>
                )}
                {(infoToggleSettings?.showConversionRules ?? true) &&
                  (calculatedVote?.appliedConversionRules?.length ?? 0) > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="font-medium text-yellow-800 mb-1">
                        Applied Rules:
                      </div>
                      {calculatedVote?.appliedConversionRules?.map(
                        (conversion) => (
                          <div key={conversion} className="text-yellow-700">
                            {conversion}
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>
          )}

        <div
          className="flex items-center justify-between p-3 rounded-lg bg-blue-50 text-slate-900 shadow-sm border border-blue-200/70 dark:bg-slate-900/70 dark:border-blue-700/60 dark:text-white"
          data-testid="structured-summary"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label="Structured vote summary"
        >
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {displaySettings?.summary?.storyPointsLabel ?? 'Story Points'}:{' '}
              <span data-testid="structured-summary-points">
                {calculatedVote?.calculatedStoryPoints || '?'}
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-200">
              {displaySettings?.summary?.weightedScoreLabel ?? 'Weighted score'}
              : {(calculatedVote?.percentageScore ?? 0).toFixed(1)}%
            </div>
          </div>
          {(displaySettings?.summary?.showConversionCount ?? true) &&
            (calculatedVote?.appliedConversionRules?.length ?? 0) > 0 && (
              <div className="text-xs text-slate-600 dark:text-slate-200">
                {calculatedVote?.appliedConversionRules?.length} rule
                {(calculatedVote?.appliedConversionRules?.length ?? 0) > 1
                  ? 's'
                  : ''}{' '}
                applied
              </div>
            )}
        </div>
      </div>
    </>
  );
}
