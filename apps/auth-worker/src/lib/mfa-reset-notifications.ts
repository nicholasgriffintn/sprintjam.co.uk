import {
  sendMfaResetRequestConfirmationEmail,
  sendMfaResetResolvedEmail,
  sendMfaResetReviewEmail,
} from "@sprintjam/services";
import type { AuthWorkerEnv } from "@sprintjam/types";

interface ResetRequester {
  email: string;
  name: string | null;
}

interface ResetAdmin {
  id: number;
  email: string;
}

export async function sendMfaResetRequestNotifications(params: {
  sendEmail: AuthWorkerEnv["SEND_EMAIL"];
  requester: ResetRequester;
  admins: ResetAdmin[];
  workspaceName: string;
  requestOrigin: string;
  expiresAt: number;
}): Promise<void> {
  const requesterName = params.requester.name?.trim() || params.requester.email;
  const reviewUrl = `${params.requestOrigin}/workspace/admin`;
  const deliveries = [
    sendMfaResetRequestConfirmationEmail({
      requesterEmail: params.requester.email,
      workspaceName: params.workspaceName,
      sendEmail: params.sendEmail,
    }),
    ...params.admins.map((admin) =>
      sendMfaResetReviewEmail({
        adminEmail: admin.email,
        requesterName,
        requesterEmail: params.requester.email,
        workspaceName: params.workspaceName,
        reviewUrl,
        expiresAt: params.expiresAt,
        sendEmail: params.sendEmail,
      }),
    ),
  ];

  const results = await Promise.allSettled(deliveries);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error(
      `Failed to deliver ${failures.length} MFA reset request notification(s).`,
    );
  }
}

export async function sendMfaResetResolutionNotification(params: {
  sendEmail: AuthWorkerEnv["SEND_EMAIL"];
  requesterEmail: string;
  workspaceName: string;
  resolution: "approved" | "rejected";
  requestOrigin: string;
}): Promise<void> {
  try {
    await sendMfaResetResolvedEmail({
      requesterEmail: params.requesterEmail,
      workspaceName: params.workspaceName,
      resolution: params.resolution,
      loginUrl: `${params.requestOrigin}/login`,
      sendEmail: params.sendEmail,
    });
  } catch (error) {
    console.error(
      "Failed to deliver MFA reset resolution notification.",
      error,
    );
  }
}
