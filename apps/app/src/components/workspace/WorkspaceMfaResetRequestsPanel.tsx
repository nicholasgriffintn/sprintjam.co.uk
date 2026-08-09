import { useState } from "react";
import { Clock3, KeyRound, ShieldAlert } from "lucide-react";
import type { WorkspaceMfaResetRequest } from "@sprintjam/types";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { toast } from "@/components/ui";
import {
  approveMfaResetRequest,
  rejectMfaResetRequest,
} from "@/lib/workspace-service";

interface PendingResolution {
  request: WorkspaceMfaResetRequest;
  resolution: "approve" | "reject";
}

interface WorkspaceMfaResetRequestsPanelProps {
  requests: WorkspaceMfaResetRequest[];
  currentUserId?: number;
  onRefresh: () => Promise<unknown>;
}

function requestDisplayName(request: WorkspaceMfaResetRequest): string {
  return request.name?.trim() || request.email;
}

export function WorkspaceMfaResetRequestsPanel({
  requests,
  currentUserId,
  onRefresh,
}: WorkspaceMfaResetRequestsPanelProps) {
  const [pendingResolution, setPendingResolution] =
    useState<PendingResolution | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const resolveRequest = async () => {
    if (!pendingResolution) return;

    const { request, resolution } = pendingResolution;
    setUpdatingRequestId(request.id);
    setError(null);
    setPendingResolution(null);

    try {
      if (resolution === "approve") {
        await approveMfaResetRequest(request.id);
      } else {
        await rejectMfaResetRequest(request.id);
      }
      await onRefresh();
      toast.success(
        resolution === "approve"
          ? `Authentication reset approved for ${request.email}`
          : `Authentication reset rejected for ${request.email}`,
      );
    } catch (resolutionError) {
      setError(
        resolutionError instanceof Error
          ? resolutionError.message
          : "Unable to resolve the authentication reset request",
      );
    } finally {
      setUpdatingRequestId(null);
    }
  };

  return (
    <SurfaceCard className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Authentication reset requests
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Review members who cannot access their authenticator, recovery
              codes, or passkeys.
            </p>
          </div>
        </div>
        <Badge variant={requests.length > 0 ? "warning" : "default"} size="sm">
          {requests.length} pending
        </Badge>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300">
          No authentication reset requests need review.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const isSelfRequest = request.userId === currentUserId;
            const isUpdating = updatingRequestId === request.id;
            return (
              <div
                className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"
                key={request.id}
              >
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm dark:bg-slate-950 dark:text-amber-300">
                      <KeyRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {requestDisplayName(request)}
                      </p>
                      <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                        {request.email}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Requested{" "}
                        {new Date(request.requestedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isUpdating}
                      onClick={() =>
                        setPendingResolution({ request, resolution: "reject" })
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      isLoading={isUpdating}
                      disabled={isSelfRequest}
                      title={
                        isSelfRequest
                          ? "Another workspace admin must approve your reset"
                          : undefined
                      }
                      onClick={() =>
                        setPendingResolution({ request, resolution: "approve" })
                      }
                    >
                      Approve reset
                    </Button>
                  </div>
                </div>
                {isSelfRequest ? (
                  <p className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-200">
                    Another workspace admin must approve your request.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingResolution !== null}
        onOpenChange={(open) => {
          if (!open) setPendingResolution(null);
        }}
        title={
          pendingResolution?.resolution === "approve"
            ? "Approve authentication reset?"
            : "Reject authentication reset?"
        }
        description={
          pendingResolution?.resolution === "approve"
            ? `This immediately removes all authenticators, recovery codes, passkeys, and active sessions for ${pendingResolution.request.email}.`
            : pendingResolution
              ? `${pendingResolution.request.email} will need to submit a new request if they still cannot sign in.`
              : undefined
        }
        confirmLabel={
          pendingResolution?.resolution === "approve"
            ? "Approve reset"
            : "Reject request"
        }
        variant={
          pendingResolution?.resolution === "approve"
            ? "destructive"
            : "default"
        }
        onConfirm={() => void resolveRequest()}
      />
    </SurfaceCard>
  );
}
