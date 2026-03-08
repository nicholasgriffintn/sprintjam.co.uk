import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Radio, Sunrise } from "lucide-react";

import { navigateTo } from "@/config/routes";
import { useSessionActions } from "@/context/SessionContext";
import { useStandupHeader } from "@/context/StandupHeaderContext";
import {
  StandupProvider,
  useStandupActions,
  useStandupState,
  useStandupStatus,
} from "@/context/StandupContext";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { getStoredUserName } from "@/hooks/useUserPersistence";
import { completeSessionByRoomKey } from "@/lib/workspace-service";
import {
  linkedRoomSessionQueryKey,
  teamSessionsQueryKey,
  WORKSPACE_STATS_QUERY_KEY,
} from "@/lib/workspace-query";
import { HttpError } from "@/lib/errors";
import { validateName } from "@/utils/validators";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PageSection } from "@/components/layout/PageBackground";
import { StandupResponseForm } from "@/components/standup/StandupResponseForm";
import { StandupFacilitatorView } from "@/components/standup/StandupFacilitatorView";
import { StandupPresentationView } from "@/components/standup/StandupPresentationView";
import { StandupSidebar } from "@/components/standup/StandupSidebar";
import { consumeStandupNotice } from "@/lib/standup-notice";

function getStandupKeyFromRoomPath(pathname: string): string | null {
  const match = pathname.match(/^\/standup\/room\/([A-Z0-9]+)$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "locked":
      return "warning";
    case "presenting":
      return "info";
    case "completed":
      return "default";
    default:
      return "success";
  }
};

function StandupRoomContent({
  standupKey,
  userName,
  isAuthenticated,
  initialNotice,
}: {
  standupKey: string;
  userName: string;
  isAuthenticated: boolean;
  initialNotice?: string | null;
}) {
  const { setScreen } = useSessionActions();
  const queryClient = useQueryClient();
  const { standupData, isModeratorView } = useStandupState();
  const { isSocketConnected, standupError, isLoading } = useStandupStatus();
  const {
    connectStandup,
    disconnectStandup,
    handleSubmitResponse,
    handleLockResponses,
    handleUnlockResponses,
    handleStartPresentation,
    handleEndPresentation,
    handleCompleteStandup,
    handleFocusUser,
  } = useStandupActions();
  const {
    setStandupKey,
    setStandupStatus,
    setRespondedCount,
    setParticipantCount,
  } = useStandupHeader();
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [isCompletingStandup, setIsCompletingStandup] = useState(false);

  useEffect(() => {
    setStandupKey(standupKey);
    return () => {
      setStandupKey(null);
      setStandupStatus(null);
      setRespondedCount(0);
      setParticipantCount(0);
    };
  }, [
    standupKey,
    setParticipantCount,
    setRespondedCount,
    setStandupKey,
    setStandupStatus,
  ]);

  useEffect(() => {
    connectStandup(standupKey, userName);
    return () => {
      disconnectStandup();
    };
  }, [connectStandup, disconnectStandup, standupKey, userName]);

  useEffect(() => {
    if (!standupData) {
      return;
    }

    setStandupStatus(standupData.status);
    setRespondedCount(standupData.respondedUsers.length);
    setParticipantCount(standupData.users.length);
  }, [
    setParticipantCount,
    setRespondedCount,
    setStandupStatus,
    standupData,
  ]);

  const completeWorkspaceHistory = async () => {
    if (!standupData?.teamId || !isAuthenticated) {
      return;
    }

    try {
      const updatedSession = await completeSessionByRoomKey(standupKey);
      queryClient.setQueryData(
        linkedRoomSessionQueryKey(standupKey),
        updatedSession,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: teamSessionsQueryKey(updatedSession.teamId),
        }),
        queryClient.invalidateQueries({
          queryKey: WORKSPACE_STATS_QUERY_KEY,
        }),
      ]);
      setCompletionNotice(null);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return;
      }

      setCompletionNotice(
        error instanceof Error
          ? `${error.message} The standup is complete, but workspace history was not updated.`
          : "The standup is complete, but workspace history was not updated.",
      );
    }
  };

  const onCompleteStandup = async () => {
    if (
      !standupData ||
      standupData.status === "completed" ||
      !isModeratorView ||
      !isSocketConnected
    ) {
      return;
    }

    setIsCompletingStandup(true);
    setCompletionNotice(null);

    try {
      handleCompleteStandup();
      await completeWorkspaceHistory();
    } finally {
      setIsCompletingStandup(false);
    }
  };

  if (standupError && !standupData) {
    return (
      <PageSection maxWidth="md">
        <SurfaceCard className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Connection issue
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {standupError}
          </p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => {
                setScreen("standupJoin");
                navigateTo("standupJoin", { standupKey });
              }}
            >
              Back to join
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </SurfaceCard>
      </PageSection>
    );
  }

  if (isLoading || !standupData) {
    return (
      <PageSection maxWidth="md">
        <SurfaceCard className="flex flex-col items-center gap-4 py-12 text-center">
          <Spinner size="lg" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Connecting to standup...
          </p>
        </SurfaceCard>
      </PageSection>
    );
  }

  const yourResponse = standupData.responses.find(
    (response) => response.userName.toLowerCase() === userName.toLowerCase(),
  );
  const isPresentationMode =
    isModeratorView && standupData.status === "presenting";

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <motion.div
        className="flex flex-1 flex-col py-0 md:grid md:h-[calc(100vh-65px)] md:grid-cols-[minmax(280px,360px)_1fr] md:items-start md:overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="order-2 border-b border-white/30 dark:border-white/10 md:order-none md:h-full md:min-h-0 md:border-b-0 md:border-r">
          <div className="flex h-full min-h-0 flex-col gap-3 p-3 shadow-sm backdrop-blur md:sticky md:top-[65px] md:h-[calc(100vh-65px)] md:min-h-[420px]">
            <StandupSidebar
              standupData={standupData}
              currentUserName={userName}
              isSocketConnected={isSocketConnected}
            />
          </div>
        </div>

        <div className="order-1 flex flex-col gap-4 px-4 py-3 md:order-none md:max-h-[calc(100vh-65px)] md:min-h-0 md:overflow-y-auto md:py-5">
          <SurfaceCard className="overflow-hidden p-0">
            <div className="border-b border-black/5 bg-gradient-to-br from-amber-100/90 via-white to-brand-50 px-6 py-6 dark:border-white/10 dark:from-amber-500/10 dark:via-slate-950 dark:to-brand-500/10">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="warning">
                  <Sunrise className="mr-1 h-3.5 w-3.5" />
                  Live standup
                </Badge>
                <Badge variant={getStatusBadgeVariant(standupData.status)}>
                  {standupData.status}
                </Badge>
                <Badge variant={isSocketConnected ? 'success' : 'warning'}>
                  <Radio className="mr-1 h-3 w-3" />
                  {isSocketConnected ? 'Connected' : 'Reconnecting'}
                </Badge>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:items-end">
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    Morning check-in for {standupData.users.length} people
                  </h1>
                  <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                    Responses stay private between each participant and the
                    facilitator. Everyone else only sees who has checked in.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/60">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Facilitator
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {standupData.moderator}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/60">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Submitted
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {standupData.respondedUsers.length}/
                      {standupData.users.length}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/60">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Your role
                    </div>
                    <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {isModeratorView ? 'Facilitator' : 'Participant'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SurfaceCard>

          {initialNotice ? (
            <Alert variant="warning">{initialNotice}</Alert>
          ) : null}
          {completionNotice ? (
            <Alert variant="warning">{completionNotice}</Alert>
          ) : null}
          {standupError ? (
            <Alert variant="warning">{standupError}</Alert>
          ) : null}

          {isPresentationMode ? (
            <StandupPresentationView
              standupData={standupData}
              onFocusUser={handleFocusUser}
              onEndPresentation={handleEndPresentation}
              onCompleteStandup={onCompleteStandup}
              isCompletingStandup={isCompletingStandup}
            />
          ) : (
            <div className="space-y-6">
              {isModeratorView && (
                <StandupFacilitatorView
                  standupData={standupData}
                  isSocketConnected={isSocketConnected}
                  onLockResponses={handleLockResponses}
                  onUnlockResponses={handleUnlockResponses}
                  onStartPresentation={handleStartPresentation}
                  onCompleteStandup={onCompleteStandup}
                  onFocusUser={handleFocusUser}
                  isCompletingStandup={isCompletingStandup}
                />
              )}
              <StandupResponseForm
                response={yourResponse}
                status={standupData.status}
                teamId={standupData.teamId}
                isModeratorView={isModeratorView}
                isSocketConnected={isSocketConnected}
                onSubmit={handleSubmitResponse}
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function StandupRoomScreen() {
  const { user, isAuthenticated } = useWorkspaceData();
  const { setScreen } = useSessionActions();
  const [standupKey, setStandupKey] = useState<string | null>(() =>
    getStandupKeyFromRoomPath(window.location.pathname),
  );
  const [initialNotice, setInitialNotice] = useState<string | null>(null);
  const workspaceName = user?.name?.trim() ?? "";
  const userName = useMemo(
    () => (validateName(workspaceName).ok ? workspaceName : getStoredUserName()),
    [workspaceName],
  );
  const isUserNameValid = validateName(userName).ok;

  useEffect(() => {
    const handlePopState = () => {
      setStandupKey(getStandupKeyFromRoomPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!standupKey) {
      setScreen("standupJoin");
      navigateTo("standupJoin");
      return;
    }

    setInitialNotice(consumeStandupNotice(standupKey));
  }, [setScreen, standupKey]);

  useEffect(() => {
    if (!standupKey || isUserNameValid) {
      return;
    }

    setScreen("standupJoin");
    navigateTo("standupJoin", { standupKey });
  }, [isUserNameValid, setScreen, standupKey]);

  if (!standupKey) {
    return null;
  }

  if (!isUserNameValid) {
    return null;
  }

  return (
    <StandupProvider userName={userName.trim()}>
      <StandupRoomContent
        standupKey={standupKey}
        userName={userName.trim()}
        isAuthenticated={isAuthenticated}
        initialNotice={initialNotice}
      />
    </StandupProvider>
  );
}
