export interface SendMagicLinkEmailParams {
  email: string;
  magicLink: string;
  resendApiKey: string;
}

export async function sendMagicLinkEmail({
  email,
  magicLink,
  resendApiKey,
}: SendMagicLinkEmailParams): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "SprintJam <sprintjam@notifications.nicholasgriffin.dev>",
      to: [email],
      subject: "Sign in to SprintJam Workspaces",
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
            <div style="background-color: #0f1d35; border-radius: 16px; padding: 48px 32px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Sign in to your workspace</h2>

              <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Click the button below to sign in to SprintJam Workspaces. This link will expire in 15 minutes.
              </p>

              <!-- Sign In Button -->
              <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #2f6dff 0%, #5c7cfa 100%); color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 1rem; font-weight: 600; font-size: 14px; box-shadow: 0px 18px 45px rgba(15, 23, 42, 0.18); margin-bottom: 24px;">
                Sign in to SprintJam
              </a>

              <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>

            <!-- Alternative Link -->
            <div style="margin-top: 24px; padding: 16px; background-color: rgba(15, 29, 53, 0.5); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">Or copy and paste this link into your browser:</p>
              <p style="margin: 0;">
                <a href="${magicLink}" style="color: #2f6dff; font-size: 12px; word-break: break-all; text-decoration: none;">${magicLink}</a>
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
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}
