import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2,
  KeyRound,
  Lock,
  Radio,
  Sunrise,
} from "lucide-react";

import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import {
  getStoredUserAvatar,
  getStoredUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";
import { sanitiseAvatarValue } from "@/utils/avatars";
import {
  formatRoomKey,
  validateName,
  validatePasscode,
  validateRoomKey,
} from "@/utils/validators";
import { navigateTo } from "@/config/routes";
import { useStandupHeader } from "@/context/StandupHeaderContext";
import {
  StandupProvider,
  useStandupState,
  useStandupStatus,
  useStandupActions,
} from "@/context/StandupContext";
import {
  createStandup,
  joinStandup,
  type StandupSessionResponse,
} from "@/lib/standup-api-service";
import {
  completeSessionByRoomKey,
  createTeamSession,
} from "@/lib/workspace-service";
import {
  linkedRoomSessionQueryKey,
  teamSessionsQueryKey,
  WORKSPACE_STATS_QUERY_KEY,
} from "@/lib/workspace-query";
import { HttpError } from "@/lib/errors";
import { PageSection } from "@/components/layout/PageBackground";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { StandupResponseForm } from "@/components/standup/StandupResponseForm";
import { StandupFacilitatorView } from "@/components/standup/StandupFacilitatorView";
import { StandupPresentationView } from "@/components/standup/StandupPresentationView";
import { StandupSidebar } from "@/components/standup/StandupSidebar";

type StandupMode = "create" | "join";

const getStandupKeyFromPath = () => {
  const match = window.location.pathname.match(/^\/standup\/([A-Z0-9]+)$/i);
  return match?.[1]?.toUpperCase() ?? "";
};

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
  notice,
}: {
  standupKey: string;
  userName: string;
  isAuthenticated: boolean;
  notice?: string | null;
}) {
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
    handlePing,
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
            <Button onClick={() => navigateTo("standup")}>Back to standup</Button>
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
    (response) => response.userName === userName,
  );
  const isPresentationMode =
    isModeratorView && standupData.status === "presenting";

  return (
    <PageSection maxWidth="xl" className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
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
              <Badge variant={isSocketConnected ? "success" : "warning"}>
                <Radio className="mr-1 h-3 w-3" />
                {isSocketConnected ? "Connected" : "Reconnecting"}
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
                    {standupData.respondedUsers.length}/{standupData.users.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/60">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Your role
                  </div>
                  <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {isModeratorView ? "Facilitator" : "Participant"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        {notice ? <Alert variant="warning">{notice}</Alert> : null}
        {completionNotice ? (
          <Alert variant="warning">{completionNotice}</Alert>
        ) : null}
        {standupError ? <Alert variant="warning">{standupError}</Alert> : null}

        {isPresentationMode ? (
          <StandupPresentationView
            standupData={standupData}
            onFocusUser={handleFocusUser}
            onEndPresentation={handleEndPresentation}
            onCompleteStandup={onCompleteStandup}
            isCompletingStandup={isCompletingStandup}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
            <div className="space-y-6">
              {isModeratorView ? (
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
              ) : (
                <SurfaceCard className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Live room status
                      </h2>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Your update stays private. The team can only see who has
                        submitted, not what they wrote.
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handlePing}>
                      Ping room
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Submission progress
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                        {standupData.respondedUsers.length}/{standupData.users.length}
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200/80 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-brand-500 to-sky-500"
                          style={{
                            width: standupData.users.length
                              ? `${(standupData.respondedUsers.length / standupData.users.length) * 100}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Your state
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                        {yourResponse ? "Saved" : "Waiting"}
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {yourResponse
                          ? "The facilitator has your latest update."
                          : "Join status is already visible while you prepare your response."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.75rem] border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Room privacy
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                        The socket sends you your own response plus the shared
                        list of who has submitted. Other response content never
                        reaches participant clients.
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Room status
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {standupData.status === "locked"
                          ? "Responses are locked. You can still follow presence and submit progress from the roster."
                          : standupData.status === "presenting"
                            ? "The facilitator is presenting responses now. You can still watch room status update live."
                            : "The room is open for live updates and the facilitator can move into presentation whenever they are ready."}
                      </p>
                    </div>
                  </div>
                </SurfaceCard>
              )}
            </div>

            <div className="space-y-6">
              <StandupResponseForm
                response={yourResponse}
                status={standupData.status}
                teamId={standupData.teamId}
                isModeratorView={isModeratorView}
                isSocketConnected={isSocketConnected}
                onSubmit={handleSubmitResponse}
              />

              <StandupSidebar
                standupData={standupData}
                currentUserName={userName}
              />
            </div>
          </div>
        )}
      </motion.div>
    </PageSection>
  );
}

export default function StandupScreen() {
  const {
    user,
    teams,
    selectedTeamId,
    setSelectedTeamId,
    isAuthenticated,
  } = useWorkspaceData();
  const storedAvatar = useMemo(() => getStoredUserAvatar(), []);
  const workspaceName = user?.name?.trim() ?? "";
  const workspaceAvatar = sanitiseAvatarValue(user?.avatar);
  const [userName, setUserName] = useState(() =>
    validateName(workspaceName).ok ? workspaceName : getStoredUserName(),
  );
  const [mode, setMode] = useState<StandupMode>(
    getStandupKeyFromPath() ? "join" : "create",
  );
  const [standupKeyInput, setStandupKeyInput] = useState(getStandupKeyFromPath());
  const [passcode, setPasscode] = useState("");
  const [activeStandupKey, setActiveStandupKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  useUserPersistence({
    name: userName,
    avatar: storedAvatar,
  });

  useEffect(() => {
    if (!validateName(userName).ok && validateName(workspaceName).ok) {
      setUserName(workspaceName);
    }
  }, [userName, workspaceName]);

  useEffect(() => {
    const handlePopState = () => {
      const nextKey = getStandupKeyFromPath();
      setStandupKeyInput(nextKey);
      setMode(nextKey ? "join" : "create");
      setActiveStandupKey(null);
      setPasscode("");
      setError(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const nameValidation = validateName(userName);
  const keyValidation =
    mode === "join" ? validateRoomKey(standupKeyInput) : { ok: true };
  const passcodeValidation = validatePasscode(passcode);
  const isFormValid =
    nameValidation.ok && keyValidation.ok && passcodeValidation.ok;
  const avatarValue = workspaceAvatar ?? storedAvatar ?? undefined;
  const teamIdForCreate = selectedTeam?.canAccess ? selectedTeam.id : undefined;

  const getStandupSessionName = () =>
    `Standup ${new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date())}`;

  const handleSuccess = (
    nextMode: StandupMode,
    response: StandupSessionResponse,
    nextError: string | null = null,
  ) => {
    const nextKey = response.standup.key;
    setMode(nextMode);
    setStandupKeyInput(nextKey);
    setActiveStandupKey(nextKey);
    setPasscode("");
    setError(nextError);
    navigateTo("standup", { standupKey: nextKey });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "create") {
        let workspaceWarning: string | null = null;
        const response = await createStandup(
          userName.trim(),
          passcode.trim() || undefined,
          avatarValue,
          teamIdForCreate,
        );

        if (teamIdForCreate) {
          try {
            await createTeamSession(
              teamIdForCreate,
              getStandupSessionName(),
              response.standup.key,
              { type: "standup" },
            );
          } catch (workspaceError) {
            workspaceWarning =
              workspaceError instanceof Error
                ? `${workspaceError.message} The standup room is live, but it was not linked into workspace history.`
                : "The standup room is live, but it was not linked into workspace history.";
          }
        }

        handleSuccess("join", response, workspaceWarning);
        return;
      }

      const response = await joinStandup(
        userName.trim(),
        standupKeyInput.trim().toUpperCase(),
        passcode.trim() || undefined,
        avatarValue,
      );
      handleSuccess("join", response);
    } catch (submitError) {
      if (
        submitError instanceof Error &&
        submitError.message === "PASSCODE_REQUIRED"
      ) {
        setError("Passcode required or incorrect. Try again.");
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to continue with this standup.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeStandupKey) {
    return (
      <StandupProvider userName={userName.trim()}>
        <StandupRoomContent
          standupKey={activeStandupKey}
          userName={userName.trim()}
          isAuthenticated={isAuthenticated}
          notice={error}
        />
      </StandupProvider>
    );
  }

  return (
    <PageSection maxWidth="xl" className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.95fr)]"
      >
        <div className="space-y-6">
          <div className="space-y-4 text-left">
            <Badge variant="warning" className="rounded-full px-3 py-1 text-[11px] tracking-[0.25em] uppercase">
              <Sunrise className="mr-1 h-3.5 w-3.5" />
              Standup facilitator
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Run the morning check-in without turning it into a status theatre exercise.
              </h1>
              <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300">
                Create a fresh room for today, let the team post updates before the call,
                and keep sensitive response content visible only to the facilitator.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SurfaceCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Fresh each day
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Every standup is a single-use room with a clean join link.
              </div>
            </SurfaceCard>
            <SurfaceCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Private by default
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Participants do not receive each other&apos;s response content over the socket.
              </div>
            </SurfaceCard>
            <SurfaceCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Workspace-aware
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Team standups can link provider tickets and appear in workspace
                history.
              </div>
            </SurfaceCard>
          </div>
        </div>

        <SurfaceCard className="space-y-6">
          <div className="space-y-2 text-left">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Open a standup room
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Start a new session or join an existing room with the team code.
            </p>
          </div>

          <Tabs.Root
            value={mode}
            onValueChange={(value) => setMode(value as StandupMode)}
          >
            <Tabs.List fullWidth>
              <Tabs.Tab value="create">Create</Tabs.Tab>
              <Tabs.Tab value="join">Join</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="create">
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error ? <Alert variant="error">{error}</Alert> : null}

                <Input
                  id="standup-create-name"
                  label="Your name"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  placeholder="Facilitator name"
                  fullWidth
                  required
                  showValidation
                  isValid={nameValidation.ok}
                  helperText={
                    nameValidation.ok ? undefined : nameValidation.error
                  }
                />

                <Input
                  id="standup-create-passcode"
                  label={
                    <span className="flex items-center gap-2">
                      Passcode
                      <span className="text-xs font-normal text-slate-400">
                        optional
                      </span>
                    </span>
                  }
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                  placeholder="Add a passcode for today&apos;s room"
                  fullWidth
                  icon={<Lock className="h-4 w-4" />}
                  helperText={
                    passcodeValidation.ok ? undefined : passcodeValidation.error
                  }
                />

                {isAuthenticated && teams.length > 0 ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="standup-team-select"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Workspace team
                    </label>
                    <Select
                      id="standup-team-select"
                      value={selectedTeamId ? String(selectedTeamId) : "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setSelectedTeamId(null);
                          return;
                        }

                        const parsed = Number.parseInt(value, 10);
                        if (!Number.isNaN(parsed)) {
                          setSelectedTeamId(parsed);
                        }
                      }}
                      options={[
                        { label: "Personal standup (no team)", value: "none" },
                        ...teams.map((team) => ({
                          label: team.canAccess
                            ? team.name
                            : team.currentUserStatus === "pending"
                              ? `${team.name} (Access pending)`
                              : `${team.name} (Restricted)`,
                          value: String(team.id),
                        })),
                      ]}
                    />
                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {selectedTeam
                          ? selectedTeam.canAccess
                            ? "Workspace mode saves this standup to team history and unlocks ticket linking."
                            : "You need team access before saving standups into this workspace team."
                          : "Leave this as personal if you only need a standalone standup room."}
                      </span>
                    </div>
                  </div>
                ) : null}

                <Button type="submit" fullWidth isLoading={isSubmitting}>
                  Create standup
                </Button>
              </form>
            </Tabs.Panel>

            <Tabs.Panel value="join">
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error ? <Alert variant="error">{error}</Alert> : null}

                <Input
                  id="standup-join-name"
                  label="Your name"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  placeholder="Team member name"
                  fullWidth
                  required
                  showValidation
                  isValid={nameValidation.ok}
                  helperText={
                    nameValidation.ok ? undefined : nameValidation.error
                  }
                />

                <Input
                  id="standup-join-key"
                  label="Standup key"
                  value={standupKeyInput}
                  onChange={(event) =>
                    setStandupKeyInput(formatRoomKey(event.target.value))
                  }
                  placeholder="ABC123"
                  maxLength={6}
                  fullWidth
                  required
                  icon={<KeyRound className="h-4 w-4" />}
                  showValidation
                  isValid={keyValidation.ok}
                  helperText={keyValidation.ok ? undefined : keyValidation.error}
                />

                <Input
                  id="standup-join-passcode"
                  label={
                    <span className="flex items-center gap-2">
                      Passcode
                      <span className="text-xs font-normal text-slate-400">
                        optional
                      </span>
                    </span>
                  }
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                  placeholder="Only if the facilitator set one"
                  fullWidth
                  icon={<Lock className="h-4 w-4" />}
                  helperText={
                    passcodeValidation.ok ? undefined : passcodeValidation.error
                  }
                />

                <Button type="submit" fullWidth isLoading={isSubmitting}>
                  Join standup
                </Button>
              </form>
            </Tabs.Panel>
          </Tabs.Root>
        </SurfaceCard>
      </motion.div>
    </PageSection>
  );
}
