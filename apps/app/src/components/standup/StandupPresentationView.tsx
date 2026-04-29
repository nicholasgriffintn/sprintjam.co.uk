import { useCallback, useEffect, useMemo, useState } from "react";
import type { StandupData } from "@sprintjam/types";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Play,
  Shuffle,
  X,
} from "lucide-react";

import { StandupUserCard } from "@/components/standup/StandupUserCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface StandupPresentationViewProps {
  standupData: StandupData;
  onFocusUser: (userName: string) => void;
  onEndPresentation: () => void;
  onCompleteStandup: () => void;
  onAddReaction: (responseUserName: string, emoji: string) => void;
  onRemoveReaction: (responseUserName: string, emoji: string) => void;
  currentUserName: string;
  isCompletingStandup?: boolean;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function StandupPresentationView({
  standupData,
  onFocusUser,
  onEndPresentation,
  onCompleteStandup,
  onAddReaction,
  onRemoveReaction,
  currentUserName,
  isCompletingStandup = false,
}: StandupPresentationViewProps) {
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);

  const baseOrderedResponses = useMemo(() => {
    const userOrder = new Map(
      standupData.users.map((user, index) => [user, index]),
    );
    return [...standupData.responses].sort(
      (left, right) =>
        (userOrder.get(left.userName) ?? Number.MAX_SAFE_INTEGER) -
        (userOrder.get(right.userName) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [standupData.responses, standupData.users]);

  const orderedResponses = useMemo(() => {
    if (!shuffledOrder) return baseOrderedResponses;
    const orderMap = new Map(shuffledOrder.map((name, i) => [name, i]));
    return [...baseOrderedResponses].sort(
      (a, b) =>
        (orderMap.get(a.userName) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(b.userName) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [baseOrderedResponses, shuffledOrder]);

  const firstSubmitter = useMemo(() => {
    if (!orderedResponses.length) return undefined;
    return orderedResponses.reduce((min, r) =>
      r.submittedAt < min.submittedAt ? r : min,
    ).userName;
  }, [orderedResponses]);

  const hasPrivateHealth = orderedResponses.some((r) => r.isHealthCheckPrivate);
  const averageHealth =
    orderedResponses.length && !hasPrivateHealth
      ? orderedResponses.reduce((sum, r) => sum + r.healthCheck, 0) /
        orderedResponses.length
      : null;

  const focusedIndex = orderedResponses.findIndex(
    (response) => response.userName === standupData.focusedUser,
  );
  const activeIndex = focusedIndex >= 0 ? focusedIndex : 0;
  const activeResponse = orderedResponses[activeIndex];

  useEffect(() => {
    if (!orderedResponses.length || standupData.focusedUser) {
      return;
    }
    const firstResponse = orderedResponses[0];
    if (firstResponse) {
      onFocusUser(firstResponse.userName);
    }
  }, [onFocusUser, orderedResponses, standupData.focusedUser]);

  const moveFocus = (direction: "previous" | "next") => {
    if (!orderedResponses.length) return;
    const nextIndex =
      direction === "previous"
        ? (activeIndex - 1 + orderedResponses.length) % orderedResponses.length
        : (activeIndex + 1) % orderedResponses.length;
    const nextResponse = orderedResponses[nextIndex];
    if (nextResponse) {
      onFocusUser(nextResponse.userName);
    }
  };

  const handleShuffle = useCallback(() => {
    const shuffled = shuffleArray(orderedResponses.map((r) => r.userName));
    setShuffledOrder(shuffled);
    onFocusUser(shuffled[0]!);
  }, [orderedResponses, onFocusUser]);

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
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default" className="gap-1">
                {activeIndex + 1} of {orderedResponses.length} —{" "}
                {activeResponse?.userName}
              </Badge>
              {averageHealth !== null ? (
                <Badge
                  variant={
                    averageHealth >= 4
                      ? "success"
                      : averageHealth >= 2
                        ? "warning"
                        : "error"
                  }
                  className="gap-1"
                >
                  <Heart className="h-3 w-3" />
                  Avg. health {averageHealth.toFixed(1)}/5
                </Badge>
              ) : null}
            </div>
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
              onClick={handleShuffle}
              icon={<Shuffle className="h-4 w-4" />}
            >
              Shuffle
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

      {activeResponse ? (
        <StandupUserCard
          response={activeResponse}
          avatar={standupData.userAvatars?.[activeResponse.userName]}
          variant="presentation"
          isFocused
          isFirstSubmitter={activeResponse.userName === firstSubmitter}
          reactions={standupData.reactions?.[activeResponse.userName]}
          onAddReaction={(emoji) =>
            onAddReaction(activeResponse.userName, emoji)
          }
          onRemoveReaction={(emoji) =>
            onRemoveReaction(activeResponse.userName, emoji)
          }
          currentUserName={currentUserName}
        />
      ) : null}
    </div>
  );
}
