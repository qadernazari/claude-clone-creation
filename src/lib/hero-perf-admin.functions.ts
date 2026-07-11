import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  hours: z.number().int().min(1).max(24 * 30).default(24),
  effectiveType: z.string().max(16).optional(),
  country: z.string().max(8).optional(),
  preloadCacheHit: z.enum(["all", "hit", "miss", "unknown"]).default("all"),
  deliveryType: z.string().max(32).optional(),
  correlationId: z.string().trim().max(64).optional(),
});

export type HeroPerfRow = {
  created_at: string;
  correlation_id: string | null;
  lcp_ms: number | null;
  lcp_size: number | null;
  ttfb_ms: number | null;
  resp_end_ms: number | null;
  decode_ms: number | null;
  transfer_bytes: number | null;
  encoded_bytes: number | null;
  protocol: string | null;
  preload_cache_hit: boolean | null;
  preload_url: string | null;
  delivery_type: string | null;
  resource_initiator: string | null;
  resource_count: number | null;
  viewport_w: number | null;
  dpr: number | null;
  effective_type: string | null;
  downlink: number | null;
  country: string | null;
  ua_mobile: boolean | null;
  url: string | null;
};

export type HeroPerfResponse = {
  rows: HeroPerfRow[];
  effectiveTypes: string[];
  countries: string[];
  deliveryTypes: string[];
  total: number;
};

const SELECT_COLS =
  "created_at, correlation_id, lcp_ms, lcp_size, ttfb_ms, resp_end_ms, decode_ms, transfer_bytes, encoded_bytes, protocol, preload_cache_hit, preload_url, delivery_type, resource_initiator, resource_count, viewport_w, dpr, effective_type, downlink, country, ua_mobile, url";

export const getHeroPerfLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }): Promise<HeroPerfResponse> => {
    const { supabase, userId } = context;

    // Verify admin caller.
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();

    let q = supabaseAdmin
      .from("hero_perf_logs")
      .select(SELECT_COLS)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (data.effectiveType && data.effectiveType !== "all") {
      q = q.eq("effective_type", data.effectiveType);
    }
    if (data.country && data.country !== "all") {
      q = q.eq("country", data.country);
    }
    if (data.deliveryType && data.deliveryType !== "all") {
      q = q.eq("delivery_type", data.deliveryType);
    }
    if (data.preloadCacheHit === "hit") q = q.eq("preload_cache_hit", true);
    else if (data.preloadCacheHit === "miss") q = q.eq("preload_cache_hit", false);
    else if (data.preloadCacheHit === "unknown") q = q.is("preload_cache_hit", null);

    if (data.correlationId) {
      // Prefix match — accepts both a short 8-char id from the table and a full UUID.
      q = q.ilike("correlation_id", `${data.correlationId}%`);
    }


    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Distinct facets over the same window (ignoring filters, so the dropdown
    // options don't collapse to a single value once a filter is applied).
    const { data: facets } = await supabaseAdmin
      .from("hero_perf_logs")
      .select("effective_type, country, delivery_type")
      .gte("created_at", since)
      .limit(5000);

    const effectiveTypes = Array.from(
      new Set((facets ?? []).map((r) => r.effective_type).filter(Boolean) as string[])
    ).sort();
    const countries = Array.from(
      new Set((facets ?? []).map((r) => r.country).filter(Boolean) as string[])
    ).sort();
    const deliveryTypes = Array.from(
      new Set((facets ?? []).map((r) => r.delivery_type).filter(Boolean) as string[])
    ).sort();

    return {
      rows: (rows ?? []) as HeroPerfRow[],
      effectiveTypes,
      countries,
      deliveryTypes,
      total: rows?.length ?? 0,
    };
  });
