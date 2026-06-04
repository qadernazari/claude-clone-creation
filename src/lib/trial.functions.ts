import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIAL_DAYS = 7;
const SITE_ORIGIN = "https://ir.show";

type TrialRow = {
  id: string;
  user_id: string;
  email: string;
  country: string | null;
  started_at: string;
  ends_at: string;
  status: string;
  converted_at: string | null;
  reminders_sent: Record<string, string>;
};

type ActivateResult =
  | { ok: true; trial: TrialRow }
  | { error: string };

async function sendTrialEmail(
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;
  try {
    await fetch(`${SITE_ORIGIN}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
    });
  } catch (e) {
    console.error("trial email send failed:", templateName, e);
  }
}

export const activateTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivateResult> => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string })?.email?.toLowerCase().trim();
    if (!email) return { error: "Email required" };

    // Already has a trial? Return existing row (idempotent).
    const { data: existing } = await supabase
      .from("trials")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      return { ok: true, trial: existing as TrialRow };
    }

    // Block trial reuse by email (different account, same email).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: byEmail } = await supabaseAdmin
      .from("trials")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (byEmail) {
      return { error: "A free trial has already been used for this email." };
    }

    // Country lookup — best-effort from profile, else from Cloudflare header.
    const { data: prof } = await supabase
      .from("profiles")
      .select("signup_country")
      .eq("id", userId)
      .maybeSingle();
    const country =
      prof?.signup_country ??
      getRequestHeader("cf-ipcountry") ??
      null;

    const now = new Date();
    const ends = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);

    const { data: inserted, error } = await supabaseAdmin
      .from("trials")
      .insert({
        user_id: userId,
        email,
        country,
        started_at: now.toISOString(),
        ends_at: ends.toISOString(),
        status: "active",
        reminders_sent: { welcome: now.toISOString() },
      })
      .select("*")
      .single();

    if (error || !inserted) {
      return { error: error?.message ?? "Could not start trial" };
    }

    // Fire welcome email (idempotent via idempotencyKey).
    void sendTrialEmail(
      "trial-started",
      email,
      `trial-welcome-${inserted.id}`,
      {
        trialDays: TRIAL_DAYS,
        trialEndFormatted: ends.toLocaleDateString("en-US", { dateStyle: "long" }),
        manageUrl: `${SITE_ORIGIN}/account`,
        browseUrl: `${SITE_ORIGIN}/browse`,
      },
    );

    return { ok: true, trial: inserted as TrialRow };
  });

export const getMyTrial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TrialRow | null> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("trials")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as TrialRow | null) ?? null;
  });
