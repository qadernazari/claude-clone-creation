import { createFileRoute } from "@tanstack/react-router";

const SITE_ORIGIN = "https://ir.show";

type TrialRow = {
  id: string;
  email: string;
  started_at: string;
  ends_at: string;
  status: string;
  reminders_sent: Record<string, string>;
};

async function send(template: string, to: string, idempotencyKey: string, data: Record<string, unknown>) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return false;
  try {
    const res = await fetch(`${SITE_ORIGIN}/lovable/email/transactional/send`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ templateName: template, recipientEmail: to, idempotencyKey, templateData: data }),
    });
    return res.ok;
  } catch (e) {
    console.error("trial reminder send failed:", template, e);
    return false;
  }
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { dateStyle: "long" });
}

async function processReminders() {
  const { data: trials, error } = await supabaseAdmin
    .from("trials")
    .select("id, email, started_at, ends_at, status, reminders_sent")
    .gte("ends_at", new Date(nowMs - 3 * 86_400_000).toISOString())
    .limit(500);
  if (error) {
    console.error("trial reminders fetch failed:", error.message);
    return { ok: false, error: error.message };
  }

  let processed = 0;
  for (const t of (trials ?? []) as TrialRow[]) {
    const startMs = new Date(t.started_at).getTime();
    const endMs = new Date(t.ends_at).getTime();
    const daysIn = Math.floor((nowMs - startMs) / 86_400_000);
    const sent = t.reminders_sent ?? {};
    const updates: Record<string, string> = {};
    let statusUpdate: string | null = null;

    // Day 5 reminder
    if (t.status === "active" && daysIn >= 5 && !sent.day5) {
      if (await send("trial-day-5", t.email, `trial-day5-${t.id}`, { browseUrl: `${SITE_ORIGIN}/browse` })) {
        updates.day5 = new Date().toISOString();
      }
    }
    // Day 6 reminder ("ends soon, tomorrow")
    if (t.status === "active" && daysIn >= 6 && !sent.day6) {
      if (await send("trial-day-6", t.email, `trial-day6-${t.id}`, {
        trialEndFormatted: fmt(new Date(endMs)),
        membershipUrl: `${SITE_ORIGIN}/account`,
      })) {
        updates.day6 = new Date().toISOString();
      }
    }
    // Final day (day 7 — last day before expiration)
    if (t.status === "active" && daysIn >= 7 && nowMs < endMs && !sent.finalDay) {
      if (await send("trial-final-day", t.email, `trial-final-${t.id}`, { membershipUrl: `${SITE_ORIGIN}/account` })) {
        updates.finalDay = new Date().toISOString();
      }
    }
    // Expired: mark + send conversion ask once
    if (nowMs >= endMs && t.status === "active") {
      statusUpdate = "expired";
    }
    if (nowMs >= endMs && !sent.expired) {
      if (await send("trial-expired", t.email, `trial-expired-${t.id}`, { membershipUrl: `${SITE_ORIGIN}/account` })) {
        updates.expired = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length > 0 || statusUpdate) {
      const patch: Record<string, unknown> = {};
      if (Object.keys(updates).length > 0) {
        patch.reminders_sent = { ...sent, ...updates };
      }
      if (statusUpdate) patch.status = statusUpdate;
      await supabaseAdmin.from("trials").update(patch).eq("id", t.id);
      processed += 1;
    }
  }

  return { ok: true, processed, total: trials?.length ?? 0 };
}

export const Route = createFileRoute("/api/public/hooks/trial-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const result = await process();
        return Response.json(result);
      },
      GET: async () => {
        const result = await process();
        return Response.json(result);
      },
    },
  },
});
