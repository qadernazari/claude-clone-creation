import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { regenHomeThumbnails, type RegenReport } from "@/lib/regen-thumbnails.functions";

export const Route = createFileRoute("/_authenticated/admin/regen-thumbnails")({
  component: RegenThumbnailsPage,
});

function RegenThumbnailsPage() {
  const run = useServerFn(regenHomeThumbnails);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<RegenReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRun() {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const r = await run();
      setReport(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div dir="ltr" className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold mb-1">Regenerate homepage thumbnails</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Rebuilds the CDN cache for every published film's hero and rail images
        at the sizes the homepage requests. Also reports any originals whose
        width is below 1600px — those need a genuine high-res re-upload from
        the film's admin page.
      </p>

      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {running ? "Regenerating…" : "Run regeneration"}
      </button>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {report && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Images scanned" value={report.scanned} />
            <Stat label="Variants warmed" value={report.warmed} />
            <Stat label="Errors" value={report.errors} tone={report.errors ? "warn" : undefined} />
            <Stat label="Low-res originals" value={report.lowRes.length} tone={report.lowRes.length ? "warn" : undefined} />
          </div>

          {report.lowRes.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 mb-2">
                <AlertTriangle className="h-4 w-4" />
                These originals are below 1600px wide — re-upload from the source file
              </div>
              <ul className="text-sm space-y-1">
                {report.lowRes.map((l, i) => (
                  <li key={`${l.slug}-${l.field}-${i}`} className="font-mono text-xs">
                    {l.title} — {l.field} — {l.width}×{l.height}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="rounded-md border border-border bg-card/40 p-3">
            <summary className="cursor-pointer text-sm font-medium">Log ({report.log.length} lines)</summary>
            <pre className="mt-2 max-h-96 overflow-auto text-xs whitespace-pre-wrap">
              {report.log.join("\n")}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className={`rounded-md border p-3 ${tone === "warn" ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-card/40"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
