import { SendEmail } from "@cloudflare/workers-types";

import { escapeHtml, normaliseHttpUrl } from "@sprintjam/utils";

export interface SendVerificationCodeEmailParams {
  email: string;
  code: string;
  sendEmail: SendEmail;
}

export interface SendWorkspaceInviteEmailParams {
  email: string;
  workspaceName: string;
  inviterName: string;
  loginUrl: string;
  sendEmail: SendEmail;
}

export interface SendMfaResetReviewEmailParams {
  adminEmail: string;
  requesterName: string;
  requesterEmail: string;
  workspaceName: string;
  reviewUrl: string;
  expiresAt: number;
  sendEmail: SendEmail;
}

export interface SendMfaResetRequestConfirmationEmailParams {
  requesterEmail: string;
  workspaceName: string;
  sendEmail: SendEmail;
}

export interface SendMfaResetResolvedEmailParams {
  requesterEmail: string;
  workspaceName: string;
  resolution: "approved" | "rejected";
  loginUrl: string;
  sendEmail: SendEmail;
}

export async function sendVerificationCodeEmail({
  email,
  code,
  sendEmail,
}: SendVerificationCodeEmailParams): Promise<void> {
  await sendEmail.send({
    to: email,
    from: "SprintJam <noreply@emails.sprintjam.co.uk>",
    subject: `Your SprintJam verification code is: ${code}`,
    text: `Your SprintJam verification code is: ${code}`,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a1628; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="display: inline-flex; align-items: center; gap: 12px;">
                <img src="https://sprintjam.co.uk/logo.png" alt="SprintJam" style="width: 48px; height: 48px; border-radius: 12px;" />
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">SprintJam</h1>
              </div>
            </div>

            <!-- Main Content Card -->
            <div style="background-color: #0f1d35; border-radius: 16px; padding: 48px 32px; border: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
              <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Your verification code</h2>

              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                Enter this code in SprintJam to sign in to your workspace.
              </p>

              <!-- Verification Code -->
              <div style="background: linear-gradient(135deg, #2f6dff 0%, #5c7cfa 100%); border-radius: 12px; padding: 24px 32px; display: inline-block; margin-bottom: 32px;">
                <span style="color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">${code}</span>
              </div>

              <p style="color: #64748b; font-size: 14px; margin: 0;">
                This code will expire in 15 minutes.
              </p>
            </div>

            <!-- Security Notice -->
            <div style="margin-top: 24px; padding: 16px; background-color: rgba(15, 29, 53, 0.5); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; color: #64748b; font-size: 12px;">
              <p style="margin: 0;">SprintJam - Collaborative Planning Poker</p>
            </div>
          </div>
        </body>
        </html>
      `,
  });
}

export async function sendWorkspaceInviteEmail({
  email,
  workspaceName,
  inviterName,
  loginUrl,
  sendEmail,
}: SendWorkspaceInviteEmailParams): Promise<void> {
  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeInviterName = escapeHtml(inviterName);
  const safeLoginUrl = normaliseHttpUrl(
    loginUrl,
    "https://sprintjam.co.uk/login",
  );

  await sendEmail.send({
    to: email,
    from: "SprintJam <noreply@emails.sprintjam.co.uk>",
    subject: `You were invited to ${safeWorkspaceName} on SprintJam`,
    text: `${inviterName} invited you to join ${workspaceName} on SprintJam. Use this email when you sign in and we'll route you to the invited workspace: ${loginUrl}`,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a1628; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="display: inline-flex; align-items: center; gap: 12px;">
                <img src="https://sprintjam.co.uk/logo.png" alt="SprintJam" style="width: 48px; height: 48px; border-radius: 12px;" />
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">SprintJam</h1>
              </div>
            </div>

            <div style="background-color: #0f1d35; border-radius: 16px; padding: 40px 32px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Workspace invitation</h2>
              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ${safeInviterName} invited you to join <strong>${safeWorkspaceName}</strong> on SprintJam.
              </p>
              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Use this email when you sign in and we'll route you to the invited workspace.
              </p>
              <a href="${safeLoginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2f6dff 0%, #5c7cfa 100%); color: #ffffff; text-decoration: none; border-radius: 12px; padding: 14px 22px; font-weight: 600;">
                Open SprintJam
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
  });
}

export async function sendMfaResetReviewEmail({
  adminEmail,
  requesterName,
  requesterEmail,
  workspaceName,
  reviewUrl,
  expiresAt,
  sendEmail,
}: SendMfaResetReviewEmailParams): Promise<void> {
  const safeRequesterName = escapeHtml(requesterName);
  const safeRequesterEmail = escapeHtml(requesterEmail);
  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeReviewUrl = normaliseHttpUrl(
    reviewUrl,
    "https://sprintjam.co.uk/workspace/admin",
  );
  const expiry = new Date(expiresAt).toUTCString();

  await sendEmail.send({
    to: adminEmail,
    from: "SprintJam <noreply@emails.sprintjam.co.uk>",
    subject: `Review an authentication reset request for ${workspaceName}`,
    text: `${requesterName} (${requesterEmail}) has asked to reset their SprintJam authenticator, recovery codes, and passkeys. Review and approve or reject the request before ${expiry}: ${safeReviewUrl}`,
    html: authenticationEmailHtml({
      title: "Authentication reset needs review",
      body: `<strong>${safeRequesterName}</strong> (${safeRequesterEmail}) has asked to reset their authenticator, recovery codes, and passkeys for <strong>${safeWorkspaceName}</strong>.`,
      actionLabel: "Review request",
      actionUrl: safeReviewUrl,
      footnote: `This request expires on ${escapeHtml(expiry)}. Verify the requester's identity using your normal workplace process before approving it.`,
    }),
  });
}

export async function sendMfaResetRequestConfirmationEmail({
  requesterEmail,
  workspaceName,
  sendEmail,
}: SendMfaResetRequestConfirmationEmailParams): Promise<void> {
  const safeWorkspaceName = escapeHtml(workspaceName);

  await sendEmail.send({
    to: requesterEmail,
    from: "SprintJam <noreply@emails.sprintjam.co.uk>",
    subject: "Your SprintJam authentication reset is awaiting review",
    text: `Your authentication reset request for ${workspaceName} is waiting for a workspace admin. No action is needed until you receive the outcome email. If you did not make this request, contact a workspace admin immediately.`,
    html: authenticationEmailHtml({
      title: "Reset request awaiting review",
      body: `Your authentication reset request for <strong>${safeWorkspaceName}</strong> is waiting for a workspace admin.`,
      footnote:
        "No action is needed until you receive the outcome email. If you did not make this request, contact a workspace admin immediately.",
    }),
  });
}

export async function sendMfaResetResolvedEmail({
  requesterEmail,
  workspaceName,
  resolution,
  loginUrl,
  sendEmail,
}: SendMfaResetResolvedEmailParams): Promise<void> {
  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeLoginUrl = normaliseHttpUrl(
    loginUrl,
    "https://sprintjam.co.uk/login",
  );
  const approved = resolution === "approved";

  await sendEmail.send({
    to: requesterEmail,
    from: "SprintJam <noreply@emails.sprintjam.co.uk>",
    subject: approved
      ? "Your SprintJam authentication reset was approved"
      : "Your SprintJam authentication reset was rejected",
    text: approved
      ? `Your authentication reset for ${workspaceName} was approved. Sign in again and set up a new authenticator or passkey: ${safeLoginUrl}`
      : `Your authentication reset for ${workspaceName} was rejected. Contact a workspace admin if you still cannot sign in, then submit a new request if they ask you to.`,
    html: authenticationEmailHtml({
      title: approved
        ? "Authentication reset approved"
        : "Reset request rejected",
      body: approved
        ? `Your authentication reset for <strong>${safeWorkspaceName}</strong> was approved. Your previous authenticators, recovery codes, passkeys, and active sessions have been removed.`
        : `Your authentication reset for <strong>${safeWorkspaceName}</strong> was rejected.`,
      ...(approved
        ? { actionLabel: "Sign in and set up MFA", actionUrl: safeLoginUrl }
        : {}),
      footnote: approved
        ? "Use your work email to sign in, then set up a new authenticator or passkey."
        : "Contact a workspace admin if you still cannot sign in, then submit a new request if they ask you to.",
    }),
  });
}

function authenticationEmailHtml({
  title,
  body,
  actionLabel,
  actionUrl,
  footnote,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  footnote: string;
}): string {
  const action =
    actionLabel && actionUrl
      ? `<a href="${actionUrl}" style="display: inline-block; margin-top: 8px; background: linear-gradient(135deg, #2f6dff 0%, #5c7cfa 100%); color: #ffffff; text-decoration: none; border-radius: 12px; padding: 14px 22px; font-weight: 600;">${escapeHtml(actionLabel)}</a>`
      : "";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #0a1628; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <img src="https://sprintjam.co.uk/logo.png" alt="SprintJam" style="width: 48px; height: 48px; border-radius: 12px;" />
          <h1 style="color: #ffffff; margin: 12px 0 0; font-size: 28px;">SprintJam</h1>
        </div>
        <div style="background-color: #0f1d35; border-radius: 16px; padding: 40px 32px; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${escapeHtml(title)}</h2>
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${body}</p>
          ${action}
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 24px 0 0;">${escapeHtml(footnote)}</p>
        </div>
      </div>
    </body>
    </html>`;
}
