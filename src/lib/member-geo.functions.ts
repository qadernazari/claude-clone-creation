import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Capture / refresh the signed-in member's IP + (best-effort) geo.
// Called once after sign-in from the client; safe to call repeatedly.
export const captureMemberGeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Best-effort: pick the first usable IP from forwarding headers.
    const fwd =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-real-ip") ??
      getRequestHeader("x-forwarded-for") ??
      "";
    const ip = fwd.split(",")[0]?.trim() || null;

    const { data: existing } = await supabase
      .from("profiles")
      .select("signup_ip, signup_country, signup_city")
      .eq("id", userId)
      .maybeSingle();

    let country: string | null = existing?.signup_country ?? null;
    let city: string | null = existing?.signup_city ?? null;

    // Only hit the geo API when we actually have an IP and we don't already know.
    if (ip && (!country || !city)) {
      try {
        const res = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { "User-Agent": "iran-platform" },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const j = (await res.json()) as { country_name?: string; city?: string };
          country = country ?? j.country_name ?? null;
          city = city ?? j.city ?? null;
        }
      } catch {
        // Network failures are silent — we still record IP + last_active_at.
      }
    }

    const patch: {
      last_active_at: string;
      last_ip?: string;
      signup_ip?: string;
      signup_country?: string;
      signup_city?: string;
    } = { last_active_at: new Date().toISOString() };
    if (ip) patch.last_ip = ip;
    if (ip && !existing?.signup_ip) patch.signup_ip = ip;
    if (country && !existing?.signup_country) patch.signup_country = country;
    if (city && !existing?.signup_city) patch.signup_city = city;

    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
