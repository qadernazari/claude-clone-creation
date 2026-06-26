import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, Plus, Star } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years
const BUCKET = "film-videos";

export type SubtitleTrack = {
  lang: string;
  label: string;
  url: string;
  default?: boolean;
};

const LANG_PRESETS: { code: string; label: string }[] = [
  { code: "fa", label: "Persian (فارسی)" },
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "tr", label: "Turkish" },
  { code: "ku", label: "Kurdish" },
];

function defaultLabelFor(code: string) {
  return LANG_PRESETS.find((p) => p.code === code)?.label ?? code.toUpperCase();
}

export function SubtitlesEditor({
  filmId,
  pathPrefix,
  value,
  onChange,
}: {
  filmId?: string;
  pathPrefix: string;
  value: SubtitleTrack[];
  onChange: (tracks: SubtitleTrack[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [pendingLang, setPendingLang] = useState("fa");

  function setTrack(i: number, patch: Partial<SubtitleTrack>) {
    onChange(value.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }
  function removeTrack(i: number) {
    onChange(value.filter((_, j) => j !== i));
  }
  function makeDefault(i: number) {
    onChange(value.map((t, j) => ({ ...t, default: j === i })));
  }

  async function upload(file: File) {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".vtt") && !lower.endsWith(".srt")) {
      toast.error("Use a .vtt or .srt subtitle file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Subtitle file too large (max 5 MB)");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error("You are not signed in");
      return;
    }

    // Convert .srt → .vtt client-side so the <track> element renders.
    let blob: Blob = file;
    let filename = file.name;
    if (lower.endsWith(".srt")) {
      const text = await file.text();
      const vtt = "WEBVTT\n\n" + text
        .replace(/\r+/g, "")
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
      blob = new Blob([vtt], { type: "text/vtt" });
      filename = file.name.replace(/\.srt$/i, ".vtt");
    }

    const path = `${pathPrefix}/subtitles/${crypto.randomUUID()}-${filename.replace(/[^a-z0-9._-]/gi, "_")}`;
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

    setUploading(true);
    setProgress(0);
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", "text/vtt");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(blob);
      });

      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr || !signed) throw new Error(signErr?.message || "Could not generate URL");

      const isFirst = value.length === 0;
      const next: SubtitleTrack = {
        lang: pendingLang,
        label: defaultLabelFor(pendingLang),
        url: signed.signedUrl,
        default: isFirst,
      };
      onChange([...value, next]);
      toast.success("Subtitle uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void upload(f);
    e.target.value = "";
  }

  const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="rounded-md border border-border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Subtitles & captions</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Upload .vtt (preferred) or .srt files per language. The default track
            is shown automatically when a viewer opens the film.
            {!filmId && " Save the film first to attach subtitles."}
          </div>
        </div>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((t, i) => (
            <li key={i} className="rounded-md border border-border p-2">
              <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr_auto] gap-2 items-center">
                <select
                  value={t.lang}
                  onChange={(e) => setTrack(i, { lang: e.target.value, label: defaultLabelFor(e.target.value) })}
                  className={inp}
                >
                  {LANG_PRESETS.map((p) => <option key={p.code} value={p.code}>{p.code.toUpperCase()}</option>)}
                </select>
                <input
                  value={t.label}
                  onChange={(e) => setTrack(i, { label: e.target.value })}
                  placeholder="Label shown in the player menu"
                  className={inp}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => makeDefault(i)}
                    title={t.default ? "Default track" : "Make default"}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs ${t.default ? "border-primary text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
                  >
                    <Star className={`h-3.5 w-3.5 ${t.default ? "fill-current" : ""}`} />
                    {t.default ? "Default" : "Set default"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTrack(i)}
                    aria-label="Remove"
                    className="inline-flex items-center rounded-md border border-border p-1.5 text-xs hover:bg-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground truncate">
                {decodeURIComponent(t.url.split("/").pop()?.split("?")[0] || "")}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={pendingLang}
          onChange={(e) => setPendingLang(e.target.value)}
          disabled={!filmId || uploading}
          className={`${inp} max-w-[200px]`}
        >
          {LANG_PRESETS.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
        </select>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!filmId || uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent disabled:opacity-50"
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Plus className="h-3.5 w-3.5" />}
          {uploading
            ? (progress !== null ? `Uploading… ${progress}%` : "Uploading…")
            : "Add subtitle file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".vtt,.srt,text/vtt"
          onChange={handleFile}
          className="hidden"
        />
        {!uploading && (
          <span className="text-[11px] text-muted-foreground">
            <Upload className="inline h-3 w-3 mr-1" />
            .srt files are converted to .vtt automatically.
          </span>
        )}
      </div>
    </div>
  );
}
