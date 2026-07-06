/**
 * Send a transactional email via the platform's email queue.
 * Uses the service-role key so it can be called from any server function.
 * Fire-and-forget: never throws so calling code isn't blocked by email failures.
 */
const SITE_ORIGIN = "https://ir.show";

export async function sendTransactionalEmail({
  to,
  templateName,
  templateData = {},
  idempotencyKey,
}: {
  to: string;
  templateName: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[sendTransactionalEmail] Missing SUPABASE_SERVICE_ROLE_KEY");
    return;
  }
  try {
    const res = await fetch(`${SITE_ORIGIN}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName,
        recipientEmail: to,
        templateData,
        idempotencyKey: idempotencyKey ?? `${templateName}-${to}-${Date.now()}`,
      }),
    });
    if (!res.ok) {
      console.error(
        "[sendTransactionalEmail] send failed",
        templateName,
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.error("[sendTransactionalEmail] error:", templateName, err);
  }
}
