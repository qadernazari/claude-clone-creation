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

// ---------- perf-hero report listing ----------

export type PerfReportFile = {
  name: string;
  path: string;
  size: number | null;
  updated_at: string | null;
  content_type: string | null;
  signed_url: string;
};

export const listPerfReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ files: PerfReportFile[] }> => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reports are stored under YYYY-MM-DD/perf-hero-<stamp>.{json,html}
    // Walk the top-level day folders and merge their contents.
    const { data: days, error: daysErr } = await supabaseAdmin.storage
      .from("perf-reports")
      .list("", { limit: 60, sortBy: { column: "name", order: "desc" } });
    if (daysErr) throw new Error(daysErr.message);

    const files: PerfReportFile[] = [];
    for (const day of days ?? []) {
      if (!day.name || day.name.startsWith(".")) continue;
      const { data: entries } = await supabaseAdmin.storage
        .from("perf-reports")
        .list(day.name, { limit: 500, sortBy: { column: "name", order: "desc" } });
      for (const f of entries ?? []) {
        const p = `${day.name}/${f.name}`;
        const { data: signed } = await supabaseAdmin.storage
          .from("perf-reports")
          .createSignedUrl(p, 60 * 30); // 30 min
        if (!signed?.signedUrl) continue;
        files.push({
          name: f.name,
          path: p,
          size: (f.metadata as { size?: number } | null)?.size ?? null,
          updated_at: f.updated_at ?? f.created_at ?? null,
          content_type: (f.metadata as { mimetype?: string } | null)?.mimetype ?? null,
          signed_url: signed.signedUrl,
        });
        if (files.length >= data.limit) break;
      }
      if (files.length >= data.limit) break;
    }

    files.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    return { files };
  });

// ---------- perf-hero summary (aggregate latest JSON reports) ----------

export type PerfRunViewportSummary = {
  viewport_label: string;
  passed: boolean;
  lcp_ms: number | null;
  budget_ms: number | null;
  over_budget_ms: number | null;
  correlation_id: string | null;
  failures: string[];
};

export type PerfRunSummary = {
  generated_at: string | null;
  path: string;
  passed: boolean;
  runs: number;
  passed_runs: number;
  failed_runs: number;
  viewports: PerfRunViewportSummary[];
};

export type PerfSummaryResponse = {
  latest: PerfRunSummary | null;
  runs: PerfRunSummary[];
  totals: {
    runs_considered: number;
    total_viewports: number;
    passed_viewports: number;
    failed_viewports: number;
  };
  top_regressions: Array<{
    generated_at: string | null;
    path: string;
    viewport_label: string;
    lcp_ms: number | null;
    budget_ms: number | null;
    over_budget_ms: number;
    correlation_id: string | null;
  }>;
};

export const getPerfReportsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ runs: z.number().int().min(1).max(50).default(10) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<PerfSummaryResponse> => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Collect JSON report paths across day folders, newest first.
    const { data: days } = await supabaseAdmin.storage
      .from("perf-reports")
      .list("", { limit: 60, sortBy: { column: "name", order: "desc" } });

    const jsonPaths: string[] = [];
    for (const day of days ?? []) {
      if (!day.name || day.name.startsWith(".")) continue;
      const { data: entries } = await supabaseAdmin.storage
        .from("perf-reports")
        .list(day.name, { limit: 500, sortBy: { column: "name", order: "desc" } });
      for (const f of entries ?? []) {
        if (!f.name.endsWith(".json")) continue;
        jsonPaths.push(`${day.name}/${f.name}`);
        if (jsonPaths.length >= data.runs) break;
      }
      if (jsonPaths.length >= data.runs) break;
    }

    const runs: PerfRunSummary[] = [];
    for (const p of jsonPaths) {
      const { data: signed } = await supabaseAdmin.storage
        .from("perf-reports")
        .createSignedUrl(p, 60);
      if (!signed?.signedUrl) continue;
      try {
        const res = await fetch(signed.signedUrl);
        if (!res.ok) continue;
        const doc = (await res.json()) as {
          generated_at?: string;
          lcp_budget_ms_per_viewport?: Record<string, number>;
          runs?: Array<{
            viewport_label?: string;
            viewport_key?: string;
            passed?: boolean;
            beacon?: { lcp_ms?: number; correlation_id?: string } | null;
            checks?: Array<{ ok?: boolean; label?: string; detail?: string }>;
          }>;
        };
        const budgets = doc.lcp_budget_ms_per_viewport ?? {};
        const vps: PerfRunViewportSummary[] = (doc.runs ?? []).map((r) => {
          const lcp = r.beacon?.lcp_ms ?? null;
          const key = (r.viewport_key ?? "").toLowerCase();
          const budget = budgets[key] ?? null;
          const over = lcp != null && budget != null && lcp > budget ? lcp - budget : null;
          const failures = (r.checks ?? [])
            .filter((c) => c.ok === false)
            .map((c) => `${c.label ?? "check"}: ${c.detail ?? ""}`.trim());
          return {
            viewport_label: r.viewport_label ?? key ?? "?",
            passed: !!r.passed,
            lcp_ms: lcp,
            budget_ms: budget,
            over_budget_ms: over,
            correlation_id: r.beacon?.correlation_id ?? null,
            failures,
          };
        });
        runs.push({
          generated_at: doc.generated_at ?? null,
          path: p,
          passed: vps.every((v) => v.passed),
          runs: vps.length,
          passed_runs: vps.filter((v) => v.passed).length,
          failed_runs: vps.filter((v) => !v.passed).length,
          viewports: vps,
        });
      } catch {
        // ignore malformed reports
      }
    }

    const totals = {
      runs_considered: runs.length,
      total_viewports: runs.reduce((n, r) => n + r.runs, 0),
      passed_viewports: runs.reduce((n, r) => n + r.passed_runs, 0),
      failed_viewports: runs.reduce((n, r) => n + r.failed_runs, 0),
    };

    // Top regressions = viewport failures across the window, sorted by
    // over-budget ms first, then non-LCP failures (over_budget_ms = 0).
    const regressions = runs.flatMap((r) =>
      r.viewports
        .filter((v) => !v.passed)
        .map((v) => ({
          generated_at: r.generated_at,
          path: r.path,
          viewport_label: v.viewport_label,
          lcp_ms: v.lcp_ms,
          budget_ms: v.budget_ms,
          over_budget_ms: v.over_budget_ms ?? 0,
          correlation_id: v.correlation_id,
        })),
    );
    regressions.sort((a, b) => b.over_budget_ms - a.over_budget_ms);

    return {
      latest: runs[0] ?? null,
      runs,
      totals,
      top_regressions: regressions.slice(0, 10),
    };
  });
