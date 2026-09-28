export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends a transactional email through Resend's HTTP API (no SDK dependency — it's one POST).
 * Configure with RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend).
 *
 * With no API key it doesn't send anything: outside production it logs the message to the
 * server console (so the verification link is right there during local dev), and in production
 * it reports failure so the caller can tell the user instead of pretending an email went out.
 *
 * Resolves to whether the message was handed off successfully; it never throws.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY is not set — cannot send email to", message.to);
      return false;
    }
    console.info(`[email] RESEND_API_KEY not set — would send to ${message.to}\n  Subject: ${message.subject}\n${message.text}`);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Extrack <onboarding@resend.dev>",
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend rejected the message:", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
