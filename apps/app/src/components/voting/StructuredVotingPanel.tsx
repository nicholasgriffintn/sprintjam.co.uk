import { motion } from "framer-motion";
import { useState, useEffect, useId } from "react";
import { Check, AlertTriangle } from "lucide-react";

import type {
  VotingCriterion,
  StructuredVote,
  StructuredVotingDisplaySettings,
  VoteValue,
} from "@/types";
import { TimerChip } from "./TimerChip";
import { useRoomState } from "@/context/RoomContext";
import { Button } from "@/components/ui/Button";

const MotionButton = motion(Button);

interface StructuredVotingPanelProps {
  criteria: VotingCriterion[];
  currentVote: StructuredVote | null;
  onVote: (vote: VoteValue | StructuredVote) => void;
  displaySettings?: StructuredVotingDisplaySettings;
  onOpenVotingSettings?: () => void;
  disabled?: boolean;
  currentUserVote?: VoteValue | StructuredVote | null;
}

interface CriterionRowProps {
  criterion: VotingCriterion;
  score: number | null;
  onScoreChange: (score: number) => void;
  isDisabled?: boolean;
}

function CriterionRow({
  criterion,
  score,
  onScoreChange,
  isDisabled,
}: CriterionRowProps) {
  const titleId = useId();
  const descriptionId = useId();
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
        className={`relative h-10 w-10 rounded-lg border text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
          isDisabled
            ? "opacity-40 cursor-not-allowed"
            : score === i
              ? "border-blue-500 bg-blue-600 text-white shadow-[0_0_0_2px_rgba(59,130,246,0.25),0_10px_20px_rgba(37,99,235,0.35)]"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 bg-white dark:bg-gray-800/70 text-slate-900 dark:text-white hover:shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
        }`}
        whileHover={isDisabled ? {} : { scale: 1.06, y: -2 }}
        whileTap={isDisabled ? {} : { scale: 0.95 }}
        transition={{ type: "spring", stiffness: 420, damping: 20 }}
        role="radio"
        aria-checked={score === i}
        aria-label={`${criterion.name} ${i}`}
      >
        {score === i && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow">
            <Check size={10} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
        {i}
      </MotionButton>,
    );
  }

  return (
    <div
      className="grid gap-3 py-2 border-b border-slate-200/70 dark:border-slate-700/70 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center px-2"
      data-testid={`structured-criterion-${criterion.id}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div
            id={titleId}
            className="font-semibold text-slate-900 dark:text-white"
          >
            {criterion.name}
          </div>
        </div>
        <div
          id={descriptionId}
          className="text-xs text-slate-600 dark:text-slate-200"
        >
          {criterion.description}
        </div>
      </div>
      <div className="flex flex-col gap-2 md:min-w-[220px]">
        <div
          className="flex gap-2 justify-start md:justify-end"
          role="radiogroup"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          {scoreButtons}
        </div>
      </div>
    </div>
  );
}

const normalizeVoteValue = (value: string | number) =>
  String(value).trim().toLowerCase();

const parseOptionLabel = (optionText: string) => {
  const [first, ...rest] = optionText.split(" ");
  const hasLeadingEmoji =
    first && /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(first);

  return {
    icon: hasLeadingEmoji ? first : "",
    label: hasLeadingEmoji ? rest.join(" ").trim() || first : optionText,
  };
};

export function StructuredVotingPanel({
  criteria,
  currentVote,
  onVote,
  displaySettings,
  onOpenVotingSettings,
  disabled = false,
  currentUserVote = null,
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
  const [hideSubmittedVote, setHideSubmittedVote] = useState(false);

  const [showScoringInfo, setShowScoringInfo] = useState(false);
  const infoToggleSettings = displaySettings?.infoToggle;
  const allowScoringInfoToggle = infoToggleSettings?.enabled ?? true;
  const scoringInfoPanelId = useId();

  const isVotingDisabled =
    disabled ||
    (roomData?.showVotes &&
      !roomData?.settings.allowVotingAfterReveal &&
      !roomData?.settings.alwaysRevealVotes);

  useEffect(() => {
    if (hideSubmittedVote) {
      if (!currentVote) {
        setHideSubmittedVote(false);
      }
      return;
    }
    if (currentVote?.criteriaScores) {
      setCriteriaScores({ ...currentVote.criteriaScores });
      return;
    }

    setCriteriaScores({});
  }, [currentVote, hideSubmittedVote]);

  useEffect(() => {
    if (!allowScoringInfoToggle) {
      setShowScoringInfo(false);
    }
  }, [allowScoringInfoToggle]);

  const enabledExtraOptions =
    roomData?.settings.extraVoteOptions?.filter(
      (option) => option.enabled !== false,
    ) ?? [];
  const normalizedCurrentVote =
    currentUserVote !== null && typeof currentUserVote !== "object"
      ? normalizeVoteValue(currentUserVote)
      : null;
  const selectedExtraOption =
    normalizedCurrentVote &&
    enabledExtraOptions.find((option) => {
      if (normalizeVoteValue(option.value) === normalizedCurrentVote) {
        return true;
      }
      return (
        option.aliases?.some(
          (alias) => normalizeVoteValue(alias) === normalizedCurrentVote,
        ) ?? false
      );
    });

  const hasAnyScores = Object.keys(criteriaScores).length > 0;
  const calculatedVote = hideSubmittedVote ? null : currentVote;
  const isExceptionActive = Boolean(selectedExtraOption);
  const summaryValue = isExceptionActive
    ? "—"
    : (calculatedVote?.calculatedStoryPoints ?? null);
  const weightedScore = isExceptionActive
    ? null
    : (calculatedVote?.percentageScore ?? null);

  const handleScoreChange = (criterionId: string, score: number) => {
    const newScores = { ...criteriaScores, [criterionId]: score };
    setCriteriaScores(newScores);
    setHideSubmittedVote(false);
    if (!isVotingDisabled) {
      onVote({ criteriaScores: newScores });
    }
  };

  const handleExtraVote = (value: string) => {
    setCriteriaScores({});
    setHideSubmittedVote(true);
    onVote(value);
  };

  return (
    <>
      <div
        className="text-slate-900 dark:text-white"
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
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 break-all">
                {roomData.currentTicket.description}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {displaySettings?.panelTitle ?? 'Structured Estimation'}
          </h2>
          <div className="flex items-center gap-3">
            {onOpenVotingSettings && (
              <Button
                type="button"
                variant="unstyled"
                onClick={onOpenVotingSettings}
                className="text-xs font-semibold text-blue-600 underline decoration-dotted underline-offset-4 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
              >
                Edit criteria
              </Button>
            )}
            {roomData?.settings.showTimer && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                <TimerChip />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6 lg:items-start">
            <div>
              <div className="bg-white/85 dark:bg-slate-900/55 border border-white/50 dark:border-white/5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl rounded-3xl p-2 mb-4">
                {isExceptionActive && selectedExtraOption && (
                  <div className="mb-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    The {selectedExtraOption.label} option has been selected.
                    This will override any scores submitted.
                  </div>
                )}
                {criteria.map((criterion) => (
                  <CriterionRow
                    key={criterion.id}
                    criterion={criterion}
                    score={criteriaScores[criterion.id] ?? null}
                    onScoreChange={(score) =>
                      handleScoreChange(criterion.id, score)
                    }
                    isDisabled={isVotingDisabled}
                  />
                ))}
              </div>

              {enabledExtraOptions.length > 0 && (
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-3 text-left">
                    Alternative voting options that replace regular scoring:
                  </div>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label="Alternative voting options"
                  >
                    {enabledExtraOptions.map((option) => {
                      const { icon, label } = parseOptionLabel(
                        `${option.value} ${option.label}`,
                      );
                      const isSelected = Boolean(
                        selectedExtraOption &&
                        'id' in selectedExtraOption &&
                        selectedExtraOption.id === option.id,
                      );

                      return (
                        <div
                          key={option.id}
                          className="flex flex-col items-center gap-2"
                        >
                          <MotionButton
                            type="button"
                            variant="unstyled"
                            onClick={() => handleExtraVote(option.value)}
                            disabled={isVotingDisabled}
                            data-testid={`structured-extra-option-${option.id}`}
                            aria-label={`Vote ${option.label}`}
                            role="radio"
                            aria-checked={isSelected}
                            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                              isVotingDisabled
                                ? 'opacity-50 cursor-not-allowed'
                                : isSelected
                                  ? 'border-amber-400/80 bg-amber-50 text-amber-900 shadow-[0_0_0_2px_rgba(251,191,36,0.2)] dark:border-amber-400/60 dark:bg-amber-500/10 dark:text-amber-200'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200'
                            }`}
                            whileHover={isVotingDisabled ? {} : { scale: 1.03 }}
                            whileTap={isVotingDisabled ? {} : { scale: 0.97 }}
                            transition={{
                              type: 'spring',
                              stiffness: 400,
                              damping: 20,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className="text-base leading-none"
                            >
                              {icon || option.value}
                            </span>
                            <span>{label}</span>
                          </MotionButton>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 lg:mt-0">
              <div className="lg:sticky lg:top-24 space-y-3">
                <div
                  className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-white via-blue-50/60 to-blue-100/70 p-4 text-slate-900 shadow-sm dark:border-blue-800/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/40 dark:text-white max-h-[320px] overflow-y-auto"
                  data-testid="structured-summary"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label="Structured vote summary"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {displaySettings?.summary?.storyPointsLabel ??
                      'Story Points'}
                  </div>
                  <div className="mt-1 text-3xl font-semibold">
                    <span data-testid="structured-summary-points">
                      {summaryValue ?? '—'}
                    </span>
                  </div>
                  {isExceptionActive && selectedExtraOption && (
                    <div className="mt-2 rounded-lg border border-blue-200/80 bg-white/80 px-2 py-1 text-xs text-slate-700 dark:border-blue-800/60 dark:bg-slate-900/70 dark:text-slate-200">
                      Marked as {selectedExtraOption.label}; no points
                      submitted.
                    </div>
                  )}
                  {!isExceptionActive && !hasAnyScores && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-200">
                      Select scores, then submit to generate story points.
                    </div>
                  )}
                  {!isExceptionActive && hasAnyScores && !calculatedVote && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-200">
                      Draft estimate calculating...
                    </div>
                  )}
                  {!isExceptionActive && Boolean(calculatedVote) && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-200">
                      {displaySettings?.summary?.weightedScoreLabel ??
                        'Weighted score'}
                      :{' '}
                      {weightedScore === null
                        ? '—'
                        : `${weightedScore.toFixed(1)}%`}
                    </div>
                  )}
                  {(displaySettings?.summary?.showConversionCount ?? true) &&
                    (calculatedVote?.appliedConversionRules?.length ?? 0) >
                      0 && (
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-200">
                        {calculatedVote?.appliedConversionRules?.length} rule
                        {(calculatedVote?.appliedConversionRules?.length ?? 0) >
                        1
                          ? 's'
                          : ''}{' '}
                        applied
                      </div>
                    )}
                  {allowScoringInfoToggle && Boolean(calculatedVote) && (
                    <Button
                      type="button"
                      variant="unstyled"
                      onClick={() => setShowScoringInfo(!showScoringInfo)}
                      className="mt-3 text-xs font-semibold text-blue-700 underline decoration-dotted underline-offset-4 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                      aria-expanded={showScoringInfo}
                      aria-controls={scoringInfoPanelId}
                    >
                      {showScoringInfo ? 'Hide breakdown' : 'Show breakdown'}
                    </Button>
                  )}
                  {allowScoringInfoToggle &&
                    showScoringInfo &&
                    calculatedVote && (
                      <div
                        id={scoringInfoPanelId}
                        className="mt-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-slate-900 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-white"
                        role="region"
                        aria-live="polite"
                      >
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-3">
                          {infoToggleSettings?.title ??
                            'Weighted Scoring System'}
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-200 space-y-2">
                          {(infoToggleSettings?.showContributionDetails ??
                            true) && (
                            <div className="grid grid-cols-1 gap-1">
                              {(calculatedVote?.contributions || []).map(
                                (c) => {
                                  const criterionName =
                                    criteria.find((k) => k.id === c.id)?.name ||
                                    c.id;
                                  return (
                                    <div
                                      key={c.id}
                                      className="flex justify-between items-center"
                                    >
                                      <span className="font-medium">
                                        {criterionName}:
                                      </span>
                                      <span className="text-right">
                                        {c.score}/{c.maxScore} ×{' '}
                                        {c.weightPercent.toFixed(0)}% ={' '}
                                        {c.contributionPercent.toFixed(1)}%
                                      </span>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          )}
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between font-medium">
                              <span>Total Score:</span>
                              <span>
                                {(calculatedVote?.percentageScore ?? 0).toFixed(
                                  1,
                                )}
                                %
                              </span>
                            </div>
                          </div>
                          {(infoToggleSettings?.showRangeDetails ?? true) && (
                            <div className="mt-3 text-xs">
                              <div className="font-medium mb-1">
                                {infoToggleSettings?.rangesLabel ??
                                  'Story Point Ranges:'}
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
                            (calculatedVote?.appliedConversionRules?.length ??
                              0) > 0 && (
                              <div className="mt-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-700/40 rounded-md p-3 flex items-start">
                                <AlertTriangle className="w-4 h-4 text-amber-800 dark:text-amber-200 mr-2 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                                    Applied Rules:
                                  </div>
                                  {calculatedVote?.appliedConversionRules?.map(
                                    (conversion) => (
                                      <div
                                        key={conversion}
                                        className="text-sm text-amber-700 dark:text-amber-300"
                                      >
                                        {conversion}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
