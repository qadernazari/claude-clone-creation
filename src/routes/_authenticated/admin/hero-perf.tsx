import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getHeroPerfLogs, type HeroPerfRow } from "@/lib/hero-perf-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/hero-perf")({
  component: HeroPerfPage,
});

const RANGES = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
];

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

function HeroPerfPage() {
  const [hours, setHours] = useState(24);
  const [effectiveType, setEffectiveType] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");

  const fetchFn = useServerFn(getHeroPerfLogs);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "hero-perf", hours, effectiveType, country],
    queryFn: () => fetchFn({ data: { hours, effectiveType, country } }),
  });

  const rows = data?.rows ?? [];

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

  return (
    <div dir="ltr" className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hero performance</h1>
          <p className="text-sm text-muted-foreground">
            Real-user LCP, decode time, and transfer size from the hero beacon.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-accent"
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

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
        <div className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${data?.total ?? 0} samples`}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          title="Decode time (p75, ms)"
          data={buckets}
          getY={(b) => percentile(b.decode.slice().sort((a, b) => a - b), 75)}
          color="#f59e0b"
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
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="px-4 py-2 border-b border-border text-sm font-medium">Recent samples</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">LCP</th>
                <th className="px-3 py-2">Decode</th>
                <th className="px-3 py-2">Bytes</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">URL</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-3 py-1.5 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-1.5 tabular-nums">{fmt(r.lcp_ms, " ms")}</td>
                  <td className="px-3 py-1.5 tabular-nums">{fmt(r.decode_ms, " ms")}</td>
                  <td className="px-3 py-1.5 tabular-nums">
                    {r.transfer_bytes == null ? "—" : `${(r.transfer_bytes / 1024).toFixed(1)} KB`}
                  </td>
                  <td className="px-3 py-1.5">{r.effective_type ?? "—"}</td>
                  <td className="px-3 py-1.5">{r.country ?? "—"}</td>
                  <td className="px-3 py-1.5">{r.ua_mobile == null ? "—" : r.ua_mobile ? "yes" : "no"}</td>
                  <td className="px-3 py-1.5 max-w-[280px] truncate text-muted-foreground">{r.url ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    No samples in this window.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
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
