export interface SendVerificationCodeEmailParams {
  email: string;
  code: string;
  resendApiKey: string;
}

export async function sendVerificationCodeEmail({
  email,
  code,
  resendApiKey,
}: SendVerificationCodeEmailParams): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "SprintJam <sprintjam@notifications.nicholasgriffin.co.uk>",
      to: [email],
      subject: "Your SprintJam verification code",
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
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}
