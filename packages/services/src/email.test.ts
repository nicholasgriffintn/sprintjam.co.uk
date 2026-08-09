import { describe, expect, it, vi } from "vitest";

import {
  sendMfaResetRequestConfirmationEmail,
  sendMfaResetResolvedEmail,
  sendMfaResetReviewEmail,
} from "./email";

function createSender() {
  return { send: vi.fn().mockResolvedValue({ messageId: "message-1" }) };
}

describe("MFA reset emails", () => {
  it("tells workspace admins who requested a reset and where to review it", async () => {
    const sendEmail = createSender();

    await sendMfaResetReviewEmail({
      adminEmail: "admin@example.com",
      requesterName: "Asha <script>",
      requesterEmail: "asha@example.com",
      workspaceName: "Example Workspace",
      reviewUrl: "https://sprintjam.co.uk/workspace/admin",
      expiresAt: Date.parse("2026-08-16T12:00:00Z"),
      sendEmail: sendEmail as never,
    });

    expect(sendEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@example.com",
        subject: "Review an authentication reset request for Example Workspace",
        text: expect.stringContaining(
          "https://sprintjam.co.uk/workspace/admin",
        ),
        html: expect.stringContaining("Asha &lt;script&gt;"),
      }),
    );
  });

  it("confirms to the requester that admin review is pending", async () => {
    const sendEmail = createSender();

    await sendMfaResetRequestConfirmationEmail({
      requesterEmail: "asha@example.com",
      workspaceName: "Example Workspace",
      sendEmail: sendEmail as never,
    });

    expect(sendEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "asha@example.com",
        subject: "Your SprintJam authentication reset is awaiting review",
        text: expect.stringContaining("No action is needed"),
      }),
    );
  });

  it("gives approved requesters a safe sign-in action", async () => {
    const sendEmail = createSender();

    await sendMfaResetResolvedEmail({
      requesterEmail: "asha@example.com",
      workspaceName: "Example Workspace",
      resolution: "approved",
      loginUrl: "javascript:alert(1)",
      sendEmail: sendEmail as never,
    });

    expect(sendEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Your SprintJam authentication reset was approved",
        text: expect.stringContaining("https://sprintjam.co.uk/login"),
        html: expect.not.stringContaining("javascript:"),
      }),
    );
  });

  it("tells rejected requesters to contact an admin", async () => {
    const sendEmail = createSender();

    await sendMfaResetResolvedEmail({
      requesterEmail: "asha@example.com",
      workspaceName: "Example Workspace",
      resolution: "rejected",
      loginUrl: "https://sprintjam.co.uk/login",
      sendEmail: sendEmail as never,
    });

    expect(sendEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Your SprintJam authentication reset was rejected",
        text: expect.stringContaining("Contact a workspace admin"),
      }),
    );
  });
});
