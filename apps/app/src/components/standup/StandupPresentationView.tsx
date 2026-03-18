import { useEffect, useMemo } from "react";
import type { StandupData } from "@sprintjam/types";
import { CheckCircle2, ChevronLeft, ChevronRight, Play, X } from "lucide-react";

import { StandupUserCard } from "@/components/standup/StandupUserCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface StandupPresentationViewProps {
  standupData: StandupData;
  onFocusUser: (userName: string) => void;
  onEndPresentation: () => void;
  onCompleteStandup: () => void;
  isCompletingStandup?: boolean;
}

export function StandupPresentationView({
  standupData,
  onFocusUser,
  onEndPresentation,
  onCompleteStandup,
  isCompletingStandup = false,
}: StandupPresentationViewProps) {
  const orderedResponses = useMemo(() => {
    const userOrder = new Map(
      standupData.users.map((user, index) => [user, index]),
    );

    return [...standupData.responses].sort(
      (left, right) =>
        (userOrder.get(left.userName) ?? Number.MAX_SAFE_INTEGER) -
        (userOrder.get(right.userName) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [standupData.responses, standupData.users]);
  const focusedIndex = orderedResponses.findIndex(
    (response) => response.userName === standupData.focusedUser,
  );
  const activeIndex = focusedIndex >= 0 ? focusedIndex : 0;
  const activeResponse = orderedResponses[activeIndex];

  useEffect(() => {
    if (!orderedResponses.length || standupData.focusedUser) {
      return;
    }

    onFocusUser(orderedResponses[0].userName);
  }, [onFocusUser, orderedResponses, standupData.focusedUser]);

  const moveFocus = (direction: "previous" | "next") => {
    if (!orderedResponses.length) {
      return;
    }

    const nextIndex =
      direction === "previous"
        ? (activeIndex - 1 + orderedResponses.length) % orderedResponses.length
        : (activeIndex + 1) % orderedResponses.length;

    onFocusUser(orderedResponses[nextIndex].userName);
  };

  if (!orderedResponses.length) {
    return (
      <SurfaceCard className="space-y-4 py-16 text-center">
        <Badge variant="warning" className="mx-auto">
          <Play className="mr-1 h-3 w-3" />
          Presentation mode
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          No responses to present yet
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          End presentation or wait for the team to submit updates.
        </p>
        <div className="flex justify-center">
          <Button variant="secondary" onClick={onEndPresentation}>
            End presentation
          </Button>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-6">
      <SurfaceCard className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Walk the team through one update at a time
            </h2>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              {activeIndex + 1} of {orderedResponses.length} —{" "}
              {activeResponse.userName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => moveFocus("previous")}
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => moveFocus("next")}
              icon={<ChevronRight className="h-4 w-4" />}
              iconPosition="right"
            >
              Next
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onEndPresentation}
              icon={<X className="h-4 w-4" />}
            >
              Back to overview
            </Button>
            <Button
              size="sm"
              onClick={onCompleteStandup}
              isLoading={isCompletingStandup}
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Complete standup
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <StandupUserCard
        response={activeResponse}
        avatar={standupData.userAvatars?.[activeResponse.userName]}
        variant="presentation"
        isFocused
      />
    </div>
  );
}
