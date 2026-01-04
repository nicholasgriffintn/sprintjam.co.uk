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
      from: "SprintJam <noreply@sprintjam.co.uk>",
      to: [email],
      subject: "Sign in to SprintJam Workspaces",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SprintJam</h1>
          </div>

          <div style="background: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="margin-top: 0; color: #333;">Sign in to your workspace</h2>

            <p>Click the button below to sign in to SprintJam Workspaces. This link will expire in 15 minutes.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Sign in to SprintJam
              </a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you didn't request this email, you can safely ignore it.
            </p>

            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${magicLink}" style="color: #667eea; word-break: break-all;">${magicLink}</a>
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>SprintJam - Collaborative Planning Poker</p>
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
