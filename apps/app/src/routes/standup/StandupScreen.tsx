import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Radio,
  Sunrise,
  Users,
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
import { PageSection } from "@/components/layout/PageBackground";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";

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

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

function StandupRoomContent({
  standupKey,
  userName,
}: {
  standupKey: string;
  userName: string;
}) {
  const { standupData, isModeratorView } = useStandupState();
  const { isSocketConnected, standupError, isLoading } = useStandupStatus();
  const { connectStandup, disconnectStandup, handlePing } = useStandupActions();
  const {
    setStandupKey,
    setStandupStatus,
    setRespondedCount,
    setParticipantCount,
  } = useStandupHeader();

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

  const submittedUsers = new Set(standupData.respondedUsers);
  const yourResponse = standupData.responses.find(
    (response) => response.userName === userName,
  );

  return (
    <PageSection maxWidth="xl" className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]"
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

            <div className="mt-4 space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Morning check-in for {standupData.users.length} people
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Responses stay private between each participant and the
                facilitator. Everyone else only sees who has checked in.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
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

          <div className="space-y-4 px-6 py-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Team pulse
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Live presence and submission status for everyone in the room.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handlePing}>
                Ping room
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {standupData.users.map((participant) => {
                const isConnected = standupData.connectedUsers[participant];
                const avatar = standupData.userAvatars?.[participant];
                const hasSubmitted = submittedUsers.has(participant);

                return (
                  <div
                    key={participant}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={avatar}
                        alt={participant}
                        className="h-10 w-10 border border-black/5 bg-amber-100 text-sm font-semibold text-amber-900 dark:border-white/10 dark:bg-amber-500/20 dark:text-amber-100"
                        fallback={getInitials(participant)}
                        fallbackClassName="bg-transparent"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900 dark:text-white">
                          {participant}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {participant === standupData.moderator
                            ? "Facilitator"
                            : isConnected
                              ? "In the room"
                              : "Offline"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={isConnected ? "success" : "default"} size="sm">
                        {isConnected ? "Online" : "Away"}
                      </Badge>
                      <Badge variant={hasSubmitted ? "primary" : "default"} size="sm">
                        {hasSubmitted ? "Ready" : "Waiting"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Your session
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                You are connected to the live standup room. Submission state and
                participant presence update here in real time.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-950/50">
              {yourResponse ? (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Update saved
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Your response is stored and visible to the facilitator.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Users className="h-4 w-4" />
                    No update saved yet
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Your facilitator can already see live join and submission
                    status as the room fills up.
                  </p>
                </div>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Privacy model
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Non-facilitators receive only their own response content plus the
                shared list of who has submitted.
              </p>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-2xl border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                Facilitator view: all responses, blockers, and live moderator state.
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                Participant view: your own response and the team submission list.
              </div>
            </div>
          </SurfaceCard>
        </div>
      </motion.div>
    </PageSection>
  );
}

export default function StandupScreen() {
  const { user } = useWorkspaceData();
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

  const handleSuccess = (
    nextMode: StandupMode,
    response: StandupSessionResponse,
  ) => {
    const nextKey = response.standup.key;
    setMode(nextMode);
    setStandupKeyInput(nextKey);
    setActiveStandupKey(nextKey);
    setPasscode("");
    setError(null);
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
        const response = await createStandup(
          userName.trim(),
          passcode.trim() || undefined,
          avatarValue,
        );
        handleSuccess("join", response);
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
                Ready for presentation
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200">
                Room state already tracks live status, connected users, and
                submission progress.
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
