import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getHeroPerfLogs, listPerfReports, type HeroPerfRow, type PerfReportFile } from "@/lib/hero-perf-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/hero-perf")({
  component: HeroPerfPage,
});

const RANGES = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
] as const;

const CSV_COLUMNS: (keyof HeroPerfRow)[] = [
  "created_at",
  "correlation_id",
  "lcp_ms",
  "lcp_size",
  "ttfb_ms",
  "resp_end_ms",
  "decode_ms",
  "transfer_bytes",
  "encoded_bytes",
  "protocol",
  "preload_cache_hit",
  "preload_url",
  "delivery_type",
  "resource_initiator",
  "resource_count",
  "viewport_w",
  "dpr",
  "effective_type",
  "downlink",
  "country",
  "ua_mobile",
  "url",
];

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "string" ? v : typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportRowsToCsv(rows: HeroPerfRow[], hours: number) {
  if (!rows.length) return;
  const header = CSV_COLUMNS.join(",");
  const body = rows
    .map((r) => CSV_COLUMNS.map((c) => csvEscape(r[c])).join(","))
    .join("\n");
  const csv = `${header}\n${body}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `hero-perf-${hours}h-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function fmt(n: number | null, unit: string, digits = 0) {
  if (n == null) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: digits })}${unit}`;
}

type BucketAgg = {
  t: number;
  label: string;
  lcp: number[];
  decode: number[];
  bytes: number[];
  cacheHits: number;
  cacheTotal: number;
};

const VP_BUCKETS = [
  { key: "mobile", label: "Mobile (<768)", min: 0, max: 767, color: "#f472b6" },
  { key: "tablet", label: "Tablet (768–1023)", min: 768, max: 1023, color: "#60a5fa" },
  { key: "laptop", label: "Laptop (1024–1439)", min: 1024, max: 1439, color: "#34d399" },
  { key: "desktop", label: "Desktop (≥1440)", min: 1440, max: Infinity, color: "#a78bfa" },
] as const;
type VpKey = (typeof VP_BUCKETS)[number]["key"];

function vpBucketOf(w: number | null | undefined): VpKey | null {
  if (w == null) return null;
  for (const b of VP_BUCKETS) if (w >= b.min && w <= b.max) return b.key;
  return null;
}

type EnvKey = "production" | "preview" | "local" | "unknown";

function environmentOf(url: string | null | undefined): EnvKey {
  if (!url) return "unknown";
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return "local";
  if (host === "ir.show" || host === "www.ir.show") return "production";
  if (host === "claude-clone-creation.lovable.app") return "production";
  if (host.includes("id-preview") || host.endsWith("-dev.lovable.app") || host.includes("lovable-project.com")) return "preview";
  if (host.endsWith(".lovable.app")) return "production";
  return "unknown";
}

function bucketize(rows: HeroPerfRow[], hours: number): BucketAgg[] {
  // Choose a bucket size that yields ~30-60 buckets.
  const totalMs = hours * 3600_000;
  const target = 40;
  const bucketMs = Math.max(60_000, Math.round(totalMs / target / 60_000) * 60_000);
  const now = Date.now();
  const start = now - totalMs;
  const buckets = new Map<number, BucketAgg>();
  for (let t = Math.floor(start / bucketMs) * bucketMs; t <= now; t += bucketMs) {
    buckets.set(t, { t, label: "", lcp: [], decode: [], bytes: [], cacheHits: 0, cacheTotal: 0 });
  }
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    const key = Math.floor(t / bucketMs) * bucketMs;
    const b = buckets.get(key);
    if (!b) continue;
    if (r.lcp_ms != null) b.lcp.push(r.lcp_ms);
    if (r.decode_ms != null) b.decode.push(r.decode_ms);
    if (r.transfer_bytes != null) b.bytes.push(r.transfer_bytes);
    if (r.preload_cache_hit != null) {
      b.cacheTotal += 1;
      if (r.preload_cache_hit) b.cacheHits += 1;
    }
  }
  const out = Array.from(buckets.values()).sort((a, b) => a.t - b.t);
  const showDate = hours > 24;
  for (const b of out) {
    const d = new Date(b.t);
    b.label = showDate
      ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`
      : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return out;
}

function LineChart({
  data,
  getY,
  color,
  unit,
  height = 180,
  format = (v: number) => v.toFixed(0),
}: {
  data: BucketAgg[];
  getY: (b: BucketAgg) => number | null;
  color: string;
  unit: string;
  height?: number;
  format?: (v: number) => string;
}) {
  const points = data.map((b, i) => ({ i, y: getY(b), label: b.label }));
  const ys = points.map((p) => p.y).filter((v): v is number => v != null);
  const maxY = ys.length ? Math.max(...ys) : 1;
  const minY = 0;
  const w = 800;
  const h = height;
  const pad = { l: 44, r: 12, t: 10, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const n = points.length;
  const stepX = n > 1 ? innerW / (n - 1) : innerW;

  const path = points
    .map((p, i) => {
      if (p.y == null) return null;
      const x = pad.l + i * stepX;
      const y = pad.t + innerH - ((p.y - minY) / Math.max(1, maxY - minY)) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  const gridLines = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img">
      <rect x={0} y={0} width={w} height={h} fill="transparent" />
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = pad.t + (innerH * i) / gridLines;
        const v = maxY - ((maxY - minY) * i) / gridLines;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="currentColor" strokeOpacity={0.08} />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
              {format(v)}
              {unit}
            </text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      {points.map((p, i) => {
        if (p.y == null) return null;
        const x = pad.l + i * stepX;
        const y = pad.t + innerH - ((p.y - minY) / Math.max(1, maxY - minY)) * innerH;
        return <circle key={i} cx={x} cy={y} r={2} fill={color} />;
      })}
      {points.length > 0 && (
        <>
          <text x={pad.l} y={h - 6} fontSize={10} fill="currentColor" opacity={0.6}>
            {points[0].label}
          </text>
          <text x={w - pad.r} y={h - 6} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
            {points[points.length - 1].label}
          </text>
        </>
      )}
    </svg>
  );
}

function StatCard({ title, p50, p75, p95, unit, digits = 0 }: {
  title: string;
  p50: number | null;
  p75: number | null;
  p95: number | null;
  unit: string;
  digits?: number;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div><div className="text-muted-foreground text-xs">p50</div><div className="font-medium tabular-nums">{fmt(p50, unit, digits)}</div></div>
        <div><div className="text-muted-foreground text-xs">p75</div><div className="font-medium tabular-nums">{fmt(p75, unit, digits)}</div></div>
        <div><div className="text-muted-foreground text-xs">p95</div><div className="font-medium tabular-nums">{fmt(p95, unit, digits)}</div></div>
      </div>
    </div>
  );
}

type CacheFilter = "all" | "hit" | "miss" | "unknown";

function HeroPerfPage() {
  const [hours, setHours] = useState(24);
  const [effectiveType, setEffectiveType] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [preloadCacheHit, setPreloadCacheHit] = useState<CacheFilter>("all");
  const [deliveryType, setDeliveryType] = useState<string>("all");
  const [correlationInput, setCorrelationInput] = useState<string>("");
  const [correlationId, setCorrelationId] = useState<string>("");
  const [drawerRow, setDrawerRow] = useState<HeroPerfRow | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(""); // YYYY-MM-DD local
  const [dateTo, setDateTo] = useState<string>("");
  const [viewportBucket, setViewportBucket] = useState<"all" | VpKey>("all");
  const [environment, setEnvironment] = useState<"all" | "production" | "preview" | "local" | "unknown">("all");

  const fetchFn = useServerFn(getHeroPerfLogs);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "hero-perf", hours, effectiveType, country, preloadCacheHit, deliveryType, correlationId],
    queryFn: () =>
      fetchFn({ data: { hours, effectiveType, country, preloadCacheHit, deliveryType, correlationId: correlationId || undefined } }),
  });

  const allRows = data?.rows ?? [];

  const rows = useMemo(() => {
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return allRows.filter((r) => {
      if (fromMs != null || toMs != null) {
        const t = new Date(r.created_at).getTime();
        if (fromMs != null && t < fromMs) return false;
        if (toMs != null && t > toMs) return false;
      }
      if (viewportBucket !== "all" && vpBucketOf(r.viewport_w) !== viewportBucket) return false;
      if (environment !== "all" && environmentOf(r.url) !== environment) return false;
      return true;
    });
  }, [allRows, dateFrom, dateTo, viewportBucket, environment]);

  const stats = useMemo(() => {
    const lcp = rows.map((r) => r.lcp_ms).filter((v): v is number => v != null).sort((a, b) => a - b);
    const dec = rows.map((r) => r.decode_ms).filter((v): v is number => v != null).sort((a, b) => a - b);
    const bytes = rows.map((r) => r.transfer_bytes).filter((v): v is number => v != null).sort((a, b) => a - b);
    const cacheKnown = rows.filter((r) => r.preload_cache_hit != null);
    const cacheHits = cacheKnown.filter((r) => r.preload_cache_hit === true).length;
    const cacheRate = cacheKnown.length ? (cacheHits / cacheKnown.length) * 100 : null;
    return {
      lcp: { p50: percentile(lcp, 50), p75: percentile(lcp, 75), p95: percentile(lcp, 95) },
      dec: { p50: percentile(dec, 50), p75: percentile(dec, 75), p95: percentile(dec, 95) },
      bytes: {
        p50: percentile(bytes, 50),
        p75: percentile(bytes, 75),
        p95: percentile(bytes, 95),
      },
      cacheRate,
      cacheHits,
      cacheTotal: cacheKnown.length,
    };
  }, [rows]);

  const buckets = useMemo(() => bucketize(rows, hours), [rows, hours]);

  const byViewport = useMemo(() => {
    return VP_BUCKETS.map((vp) => {
      const subset = rows.filter((r) => vpBucketOf(r.viewport_w) === vp.key);
      const lcp = subset.map((r) => r.lcp_ms).filter((v): v is number => v != null).sort((a, b) => a - b);
      const bytes = subset.map((r) => r.transfer_bytes).filter((v): v is number => v != null).sort((a, b) => a - b);
      const known = subset.filter((r) => r.preload_cache_hit != null);
      const hits = known.filter((r) => r.preload_cache_hit === true).length;
      return {
        ...vp,
        count: subset.length,
        lcpP75: percentile(lcp, 75),
        bytesP75: bytes.length ? percentile(bytes, 75)! / 1024 : null,
        cacheRate: known.length ? (hits / known.length) * 100 : null,
        cacheHits: hits,
        cacheTotal: known.length,
      };
    });
  }, [rows]);

  const vpCacheSeries = useMemo(() => {
    // For each bucket, compute cache hit % per viewport bucket.
    const perVp: Record<VpKey, Array<{ hits: number; total: number }>> = {
      mobile: [], tablet: [], laptop: [], desktop: [],
    };
    for (const _ of buckets) {
      for (const k of Object.keys(perVp) as VpKey[]) perVp[k].push({ hits: 0, total: 0 });
    }
    // Rebuild per-bucket per-viewport tallies
    const totalMs = hours * 3600_000;
    const target = 40;
    const bucketMs = Math.max(60_000, Math.round(totalMs / target / 60_000) * 60_000);
    const firstT = buckets[0]?.t ?? 0;
    for (const r of rows) {
      const vp = vpBucketOf(r.viewport_w);
      if (!vp || r.preload_cache_hit == null) continue;
      const t = new Date(r.created_at).getTime();
      const idx = Math.floor((Math.floor(t / bucketMs) * bucketMs - firstT) / bucketMs);
      const slot = perVp[vp][idx];
      if (!slot) continue;
      slot.total += 1;
      if (r.preload_cache_hit) slot.hits += 1;
    }
    return perVp;
  }, [rows, buckets, hours]);


  return (
    <div dir="ltr" className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hero performance</h1>
          <p className="text-sm text-muted-foreground">
            Real-user LCP, decode time, and transfer size from the hero beacon.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportRowsToCsv(rows, hours)}
            className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-50"
            disabled={rows.length === 0}
            title="Download the currently filtered samples as CSV"
          >
            Export CSV
          </button>
          <button
            onClick={() => refetch()}
            className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-accent"
            disabled={isFetching}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <PerfReportsList />


      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Range</label>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.hours}
                onClick={() => setHours(r.hours)}
                className={`text-xs rounded-md px-2.5 py-1.5 border ${
                  hours === r.hours ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm rounded-md border border-border bg-background px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm rounded-md border border-border bg-background px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Viewport</label>
          <select
            value={viewportBucket}
            onChange={(e) => setViewportBucket(e.target.value as "all" | VpKey)}
            className="text-sm rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="all">All widths</option>
            {VP_BUCKETS.map((vp) => (
              <option key={vp.key} value={vp.key}>{vp.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Environment</label>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as typeof environment)}
            className="text-sm rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="all">All</option>
            <option value="production">Production</option>
            <option value="preview">Preview</option>
            <option value="local">Local</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Effective type</label>
          <select
            value={effectiveType}
            onChange={(e) => setEffectiveType(e.target.value)}
            className="text-sm rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="all">All</option>
            {(data?.effectiveTypes ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-sm rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="all">All</option>
            {(data?.countries ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Preload cache</label>
          <select
            value={preloadCacheHit}
            onChange={(e) => setPreloadCacheHit(e.target.value as CacheFilter)}
            className="text-sm rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="all">All</option>
            <option value="hit">Hit</option>
            <option value="miss">Miss</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Delivery type</label>
          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            className="text-sm rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="all">All</option>
            {(data?.deliveryTypes ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-muted-foreground block mb-1">Correlation ID</label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCorrelationId(correlationInput.trim());
            }}
            className="flex gap-1"
          >
            <input
              type="text"
              value={correlationInput}
              onChange={(e) => setCorrelationInput(e.target.value)}
              placeholder="Paste UUID or 8-char prefix"
              spellCheck={false}
              className="flex-1 text-xs font-mono rounded-md border border-border bg-background px-2 py-1.5"
            />
            <button
              type="submit"
              className="text-xs rounded-md border border-border px-2.5 py-1.5 hover:bg-accent"
            >
              Find
            </button>
            {correlationId ? (
              <button
                type="button"
                onClick={() => {
                  setCorrelationInput("");
                  setCorrelationId("");
                }}
                className="text-xs rounded-md border border-border px-2.5 py-1.5 hover:bg-accent"
              >
                Clear
              </button>
            ) : null}
          </form>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {isLoading
            ? "Loading…"
            : rows.length === allRows.length
              ? `${allRows.length} samples`
              : `${rows.length} of ${allRows.length} samples`}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : null}

      {correlationId ? (
        <BeaconDetail correlationId={correlationId} rows={rows} loading={isFetching} />
      ) : null}



      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard title="LCP" p50={stats.lcp.p50} p75={stats.lcp.p75} p95={stats.lcp.p95} unit=" ms" />
        <StatCard title="Decode" p50={stats.dec.p50} p75={stats.dec.p75} p95={stats.dec.p95} unit=" ms" />
        <StatCard
          title="Transfer"
          p50={stats.bytes.p50 == null ? null : stats.bytes.p50 / 1024}
          p75={stats.bytes.p75 == null ? null : stats.bytes.p75 / 1024}
          p95={stats.bytes.p95 == null ? null : stats.bytes.p95 / 1024}
          unit=" KB"
          digits={1}
        />
        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Preload cache hit
          </div>
          <div className="text-2xl font-semibold tabular-nums">
            {stats.cacheRate == null ? "—" : `${stats.cacheRate.toFixed(1)}%`}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.cacheHits}/{stats.cacheTotal} samples
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ChartSection
          title="LCP (p75, ms)"
          data={buckets}
          getY={(b) => percentile(b.lcp.slice().sort((a, b) => a - b), 75)}
          color="#60a5fa"
          unit=" ms"
        />
        <ChartSection
          title="Transfer size (p75, KB)"
          data={buckets}
          getY={(b) => {
            const p = percentile(b.bytes.slice().sort((a, b) => a - b), 75);
            return p == null ? null : p / 1024;
          }}
          color="#34d399"
          unit=" KB"
          format={(v) => v.toFixed(1)}
        />
        <ChartSection
          title="Preload cache hit (%)"
          data={buckets}
          getY={(b) => (b.cacheTotal ? (b.cacheHits / b.cacheTotal) * 100 : null)}
          color="#a78bfa"
          unit="%"
          format={(v) => v.toFixed(0)}
        />
        <ChartSection
          title="Decode time (p75, ms)"
          data={buckets}
          getY={(b) => percentile(b.decode.slice().sort((a, b) => a - b), 75)}
          color="#f59e0b"
          unit=" ms"
        />
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="px-4 py-2 border-b border-border text-sm font-medium">
          By viewport width
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2">Viewport</th>
                <th className="px-3 py-2">Samples</th>
                <th className="px-3 py-2">LCP p75</th>
                <th className="px-3 py-2">Transfer p75</th>
                <th className="px-3 py-2">Cache hit rate</th>
                <th className="px-3 py-2 w-1/2">Cache hit rate distribution</th>
              </tr>
            </thead>
            <tbody>
              {byViewport.map((vp) => (
                <tr key={vp.key} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: vp.color }} />
                      {vp.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{vp.count}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(vp.lcpP75, " ms")}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {vp.bytesP75 == null ? "—" : `${vp.bytesP75.toFixed(1)} KB`}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {vp.cacheRate == null ? "—" : `${vp.cacheRate.toFixed(1)}%`}
                    <span className="text-muted-foreground ml-1">({vp.cacheHits}/{vp.cacheTotal})</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-full rounded bg-muted overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${vp.cacheRate ?? 0}%`,
                          background: vp.color,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="text-sm font-medium mb-1">Preload cache hit % over time, by viewport</div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
          {VP_BUCKETS.map((vp) => (
            <span key={vp.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: vp.color }} />
              {vp.label}
            </span>
          ))}
        </div>
        <MultiLineChart
          labels={buckets.map((b) => b.label)}
          series={VP_BUCKETS.map((vp) => ({
            color: vp.color,
            values: vpCacheSeries[vp.key].map((s) => (s.total ? (s.hits / s.total) * 100 : null)),
          }))}
          unit="%"
          maxY={100}
          format={(v) => v.toFixed(0)}
        />
      </div>



      <div className="rounded-md border border-border bg-card">
        <div className="px-4 py-2 border-b border-border text-sm font-medium">Recent samples</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">LCP</th>
                <th className="px-3 py-2">Bytes</th>
                <th className="px-3 py-2">Cache</th>
                <th className="px-3 py-2">Delivery</th>
                <th className="px-3 py-2">Initiator</th>
                <th className="px-3 py-2">Res.</th>
                <th className="px-3 py-2">VP</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">Correlation</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-border/60 hover:bg-muted/40 cursor-pointer"
                  onClick={() => setDrawerRow(r)}
                >
                  <td className="px-3 py-1.5 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-1.5 tabular-nums">{fmt(r.lcp_ms, " ms")}</td>
                  <td className="px-3 py-1.5 tabular-nums">
                    {r.transfer_bytes == null ? "—" : `${(r.transfer_bytes / 1024).toFixed(1)} KB`}
                  </td>
                  <td className="px-3 py-1.5">
                    {r.preload_cache_hit == null ? (
                      "—"
                    ) : r.preload_cache_hit ? (
                      <span className="text-emerald-500">hit</span>
                    ) : (
                      <span className="text-amber-500">miss</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">{r.delivery_type ?? "—"}</td>
                  <td className="px-3 py-1.5">{r.resource_initiator ?? "—"}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.resource_count ?? "—"}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.viewport_w ?? "—"}</td>
                  <td className="px-3 py-1.5">{r.effective_type ?? "—"}</td>
                  <td className="px-3 py-1.5">{r.country ?? "—"}</td>
                  <td className="px-3 py-1.5">{r.ua_mobile == null ? "—" : r.ua_mobile ? "yes" : "no"}</td>
                  <td className="px-3 py-1.5 font-mono">
                    {r.correlation_id ? (
                      <button
                        type="button"
                        title={`${r.correlation_id} — click to filter`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const id = r.correlation_id ?? "";
                          setCorrelationInput(id);
                          setCorrelationId(id);
                          if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="hover:text-foreground text-muted-foreground underline decoration-dotted"
                      >
                        {r.correlation_id.slice(0, 8)}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-1.5 max-w-[240px] truncate text-muted-foreground">{r.url ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDrawerRow(r);
                      }}
                      className="text-xs px-2 py-0.5 rounded border border-border hover:bg-muted"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={14} className="px-3 py-6 text-center text-muted-foreground">
                    No samples in this window.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <BeaconDrawer row={drawerRow} onClose={() => setDrawerRow(null)} />
    </div>
  );
}

function ChartSection(props: {
  title: string;
  data: BucketAgg[];
  getY: (b: BucketAgg) => number | null;
  color: string;
  unit: string;
  format?: (v: number) => string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-sm font-medium mb-2">{props.title}</div>
      <LineChart
        data={props.data}
        getY={props.getY}
        color={props.color}
        unit={props.unit}
        format={props.format}
      />
    </div>
  );
}

function MultiLineChart({
  labels,
  series,
  unit,
  maxY,
  height = 200,
  format = (v: number) => v.toFixed(0),
}: {
  labels: string[];
  series: Array<{ color: string; values: Array<number | null> }>;
  unit: string;
  maxY?: number;
  height?: number;
  format?: (v: number) => string;
}) {
  const w = 800;
  const h = height;
  const pad = { l: 44, r: 12, t: 10, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const n = labels.length;
  const stepX = n > 1 ? innerW / (n - 1) : innerW;
  const allY = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const computedMax = allY.length ? Math.max(...allY) : 1;
  const yMax = maxY ?? computedMax;
  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img">
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = pad.t + (innerH * i) / gridLines;
        const v = yMax - (yMax * i) / gridLines;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="currentColor" strokeOpacity={0.08} />
            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
              {format(v)}{unit}
            </text>
          </g>
        );
      })}
      {series.map((s, si) => {
        const path = s.values
          .map((v, i) => {
            if (v == null) return null;
            const x = pad.l + i * stepX;
            const y = pad.t + innerH - (v / Math.max(1, yMax)) * innerH;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .filter(Boolean)
          .join(" ");
        return <path key={si} d={path} fill="none" stroke={s.color} strokeWidth={2} />;
      })}
      {labels.length > 0 && (
        <>
          <text x={pad.l} y={h - 6} fontSize={10} fill="currentColor" opacity={0.6}>{labels[0]}</text>
          <text x={w - pad.r} y={h - 6} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
            {labels[labels.length - 1]}
          </text>
        </>
      )}
    </svg>
  );
}


function BeaconDetail({
  correlationId,
  rows,
  loading,
}: {
  correlationId: string;
  rows: HeroPerfRow[];
  loading: boolean;
}) {
  const q = correlationId.toLowerCase();
  const matches = rows.filter((r) => (r.correlation_id ?? "").toLowerCase().startsWith(q));
  const match = matches[0];

  return (
    <div className="rounded-md border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm font-medium">
          Beacon detail
          <span className="ml-2 font-mono text-xs text-muted-foreground">{correlationId}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {loading ? "Searching…" : `${matches.length} match${matches.length === 1 ? "" : "es"}`}
        </div>
      </div>
      {!match ? (
        <div className="text-sm text-muted-foreground">
          No beacon with that correlation ID in this time window. Widen the range or verify the ID.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="Time" value={new Date(match.created_at).toLocaleString()} />
          <Field label="Correlation" value={match.correlation_id ?? "—"} mono />
          <Field label="LCP" value={fmt(match.lcp_ms, " ms")} />
          <Field label="Decode" value={fmt(match.decode_ms, " ms")} />
          <Field
            label="Transfer"
            value={match.transfer_bytes == null ? "—" : `${(match.transfer_bytes / 1024).toFixed(1)} KB`}
          />
          <Field
            label="Preload cache"
            value={
              match.preload_cache_hit == null
                ? "—"
                : match.preload_cache_hit
                ? "hit"
                : "miss"
            }
          />
          <Field label="Delivery" value={match.delivery_type ?? "—"} />
          <Field label="Initiator" value={match.resource_initiator ?? "—"} />
          <Field label="Resource count" value={match.resource_count?.toString() ?? "—"} />
          <Field label="Viewport" value={match.viewport_w?.toString() ?? "—"} />
          <Field label="Effective type" value={match.effective_type ?? "—"} />
          <Field label="Country" value={match.country ?? "—"} />
          <Field
            label="Mobile"
            value={match.ua_mobile == null ? "—" : match.ua_mobile ? "yes" : "no"}
          />
          <div className="col-span-2 md:col-span-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">URL</div>
            <div className="text-xs font-mono break-all text-muted-foreground">
              {match.url ?? "—"}
            </div>
          </div>
        </div>
      )}
      {matches.length > 1 ? (
        <div className="mt-3 text-xs text-muted-foreground">
          Showing the most recent match. {matches.length - 1} older beacon
          {matches.length - 1 === 1 ? "" : "s"} share this prefix — paste the full UUID to disambiguate.
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`tabular-nums ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</div>
    </div>
  );
}

function BeaconDrawer({ row, onClose }: { row: HeroPerfRow | null; onClose: () => void }) {
  const open = !!row;
  const fields: Array<[string, unknown]> = row
    ? [
        ["created_at", row.created_at],
        ["correlation_id", row.correlation_id],
        ["url", row.url],
        ["preload_url", row.preload_url],
        ["lcp_ms", row.lcp_ms],
        ["lcp_size", row.lcp_size],
        ["ttfb_ms", row.ttfb_ms],
        ["resp_end_ms", row.resp_end_ms],
        ["decode_ms", row.decode_ms],
        ["transfer_bytes", row.transfer_bytes],
        ["encoded_bytes", row.encoded_bytes],
        ["protocol", row.protocol],
        ["delivery_type", row.delivery_type],
        ["preload_cache_hit", row.preload_cache_hit],
        ["resource_initiator", row.resource_initiator],
        ["resource_count", row.resource_count],
        ["viewport_w", row.viewport_w],
        ["dpr", row.dpr],
        ["effective_type", row.effective_type],
        ["downlink", row.downlink],
        ["country", row.country],
        ["ua_mobile", row.ua_mobile],
      ]
    : [];

  const preloadMatches =
    row && row.preload_url && row.url ? row.preload_url === row.url : null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        role="dialog"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-background border-l border-border shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {row ? (
          <div className="flex h-full flex-col">
            <header className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <div className="text-sm font-medium">Beacon details</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {row.correlation_id ?? "(no correlation id)"}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-sm px-2 py-1 rounded border border-border hover:bg-muted"
              >
                Close
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {preloadMatches != null ? (
                <div
                  className={`rounded border px-3 py-2 text-xs ${
                    preloadMatches
                      ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/5"
                      : "border-amber-500/40 text-amber-500 bg-amber-500/5"
                  }`}
                >
                  preload_url {preloadMatches ? "matches" : "does NOT match"} rendered url
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-y-2">
                {fields.map(([k, v]) => (
                  <div
                    key={k}
                    className="grid grid-cols-[140px_1fr] gap-3 items-start border-b border-border/40 pb-1.5"
                  >
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {k}
                    </div>
                    <div className="font-mono text-xs break-all">
                      {v == null || v === "" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : typeof v === "boolean" ? (
                        String(v)
                      ) : (
                        String(v)
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Raw payload
                </div>
                <pre className="text-[11px] leading-relaxed font-mono bg-muted/40 border border-border rounded p-3 overflow-x-auto">
                  {JSON.stringify(row, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
