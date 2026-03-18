import type { StandupData, StandupResponse } from "@sprintjam/types";

import { StandupFacilitatorView } from "@/components/standup/StandupFacilitatorView";
import { StandupUserCard } from "@/components/standup/StandupUserCard";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface StandupResultsPanelProps {
  standupData: StandupData;
  yourResponse?: StandupResponse;
  isModeratorView: boolean;
  isSocketConnected: boolean;
  onLockResponses: () => void;
  onUnlockResponses: () => void;
  onStartPresentation: () => void;
  onCompleteStandup: () => void;
  onFocusUser: (userName: string) => void;
  onSetTheme: (theme: string) => void;
  isLockingResponses?: boolean;
  isStartingPresentation?: boolean;
  isCompletingStandup?: boolean;
}

export function StandupResultsPanel({
  standupData,
  yourResponse,
  isModeratorView,
  isSocketConnected,
  onLockResponses,
  onUnlockResponses,
  onStartPresentation,
  onCompleteStandup,
  onFocusUser,
  onSetTheme,
  isLockingResponses = false,
  isStartingPresentation = false,
  isCompletingStandup = false,
}: StandupResultsPanelProps) {
  if (isModeratorView) {
    return (
      <StandupFacilitatorView
        standupData={standupData}
        isSocketConnected={isSocketConnected}
        onLockResponses={onLockResponses}
        onUnlockResponses={onUnlockResponses}
        onStartPresentation={onStartPresentation}
        onCompleteStandup={onCompleteStandup}
        onFocusUser={onFocusUser}
        onSetTheme={onSetTheme}
        isLockingResponses={isLockingResponses}
        isStartingPresentation={isStartingPresentation}
        isCompletingStandup={isCompletingStandup}
      />
    );
  }

  if (!yourResponse) {
    return (
      <SurfaceCard variant="subtle" className="text-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          No results yet
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Submit your update to see your standup results.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-4">
      <SurfaceCard className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Results
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Other participants can only see submission status.
        </p>
      </SurfaceCard>
      <StandupUserCard
        response={yourResponse}
        avatar={standupData.userAvatars?.[yourResponse.userName]}
      />
    </div>
  );
}
