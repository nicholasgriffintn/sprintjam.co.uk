import type { FC } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import type { RoomData } from "@/types";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { getVisibleEstimateOptions } from "@/utils/votingOptions";
import { getGuidancePhase, getVoteSpreadSummary } from "@/utils/room-guidance";

interface RoomGuidancePanelProps {
  roomData: RoomData;
  isModeratorView: boolean;
  onClose: () => void;
}

const guidanceCopy = {
  preVote: {
    moderator: {
      title: "Set the story up for success",
      body: "Present the story clearly. Read acceptance criteria aloud so everyone estimates the same scope.",
    },
    participant: {
      title: "Listen for scope and risks",
      body: "Focus on acceptance criteria and edge cases before you vote.",
    },
  },
  voting: {
    moderator: {
      title: "Keep votes independent",
      body: "Hold the reveal until everyone has voted. Hidden cards prevent anchoring.",
    },
    participant: {
      title: "Votes stay hidden",
      body: "Cards are hidden until reveal, so you can vote based on your own assessment.",
    },
  },
  revealedWideSpread: {
    moderator: {
      title: "Facilitate the extremes",
      body: "Ask the highest and lowest voters to explain their reasoning. Different assumptions usually explain the gap.",
    },
    participant: {
      title: "Share your assumptions",
      body: "If you're far from the group, share what you're seeing. It often reveals missing context.",
    },
  },
  revealedConsensus: {
    moderator: {
      title: "Lock it in",
      body: "Quick alignment is a signal. Capture the estimate and move on.",
    },
    participant: {
      title: "Confirm and move on",
      body: "When votes converge quickly, confirm the outcome and keep momentum.",
    },
  },
};

const findExtraOption = (
  roomData: RoomData,
  predicate: (value: string, label: string, aliases: string[]) => boolean,
) =>
  roomData.settings.extraVoteOptions?.find((option) =>
    predicate(
      option.value,
      option.label,
      option.aliases?.map((alias) => alias.toLowerCase()) ?? [],
    ),
  );

export const RoomGuidancePanel: FC<RoomGuidancePanelProps> = ({
  roomData,
  isModeratorView,
  onClose,
}) => {
  const summary = getVoteSpreadSummary(roomData);
  const phase = getGuidancePhase(roomData, summary);
  const role = isModeratorView ? "moderator" : "participant";
  const guidance = guidanceCopy[phase][role];

  const visibleOptions = getVisibleEstimateOptions(roomData.settings);
  const hasZero = visibleOptions.some((option) => String(option) === "0");

  const unsureOption = findExtraOption(roomData, (value, label, aliases) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes("?") ||
      aliases.includes("?") ||
      label.toLowerCase().includes("unsure")
    );
  });

  const breakOption = findExtraOption(roomData, (value, label, aliases) => {
    return (
      value.includes("☕") ||
      label.toLowerCase().includes("break") ||
      aliases.includes("break")
    );
  });

  const cardMeaningItems = [
    hasZero && {
      label: "0",
      text: "Already done, or negligible effort.",
    },
    unsureOption && {
      label: unsureOption.value,
      text: "Unknowns or missing context. Pause to clarify.",
    },
    breakOption && {
      label: breakOption.value,
      text: "Call a quick break when energy drops.",
    },
  ].filter(Boolean) as Array<{ label: string; text: string }>;

  const isFibonacci =
    roomData.settings.votingSequenceId?.includes("fibonacci") ?? false;

  return (
    <motion.aside
      key="room-guidance-panel"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-x-4 bottom-4 top-4 z-30 max-h-[calc(100vh-32px)] overflow-hidden sm:left-auto sm:right-6 sm:top-[84px] sm:bottom-6 sm:max-h-[calc(100vh-140px)] sm:w-[360px]"
      id="room-help-panel"
    >
      <SurfaceCard padding="sm" className="flex max-h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-3 dark:border-white/10">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Room help
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Contextual guidance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tailored for {isModeratorView ? "moderators" : "participants"}.
            </p>
          </div>
          <Button
            type="button"
            variant="unstyled"
            onClick={onClose}
            className="rounded-full border border-slate-200/70 bg-white/70 p-2 text-slate-500 hover:text-slate-700 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:text-white"
            aria-label="Close help panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              In this moment
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
              {guidance.title}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {guidance.body}
            </p>
          </div>

          {cardMeaningItems.length > 0 && (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Card meanings
              </h3>
              <div className="space-y-1">
                {cardMeaningItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-slate-900/40"
                  >
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.label}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isFibonacci && (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Why Fibonacci gaps widen
              </h3>
              <p>
                Bigger stories carry more uncertainty. Wider gaps keep the team
                from chasing false precision when complexity grows.
              </p>
            </div>
          )}

          {roomData.settings.enableStructuredVoting && (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Structured voting
              </h3>
              <p>
                Score each criterion first. SprintJam rolls the weighted scores
                into story points so you can compare consistently.
              </p>
            </div>
          )}

          {roomData.settings.enableJudge && (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                The Judge
              </h3>
              <p>
                The Judge suggests a consensus based on the distribution. Use it
                as a guide, and override when new context or risks surface.
              </p>
            </div>
          )}

          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Split the story when needed
            </h3>
            <p>
              Break work into slices by workflow, capability, or acceptance
              criteria. Each slice should be independently shippable.
            </p>
          </div>
        </div>
      </SurfaceCard>
    </motion.aside>
  );
};
