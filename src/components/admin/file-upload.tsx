import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

type Kind = "image" | "video";

export type FileUploadProps = {
  bucket: string;
  kind: Kind;
  accept: string;
  value: string | null;
  onChange: (url: string | null) => void;
  pathPrefix: string;
  label: string;
  description?: string;
  maxBytes?: number;
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function fmtDur(s?: number) {
  if (!s || !isFinite(s)) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function accepts(file: File, accept: string) {
  if (!accept) return true;
  return accept.split(",").some((raw) => {
    const t = raw.trim().toLowerCase();
    if (!t) return false;
    if (t.startsWith(".")) return file.name.toLowerCase().endsWith(t);
    if (t.endsWith("/*")) return file.type.toLowerCase().startsWith(t.slice(0, -1));
    return file.type.toLowerCase() === t;
  });
}

/**
 * Re-encode an image to WebP at a sensible max width before upload.
 * Cuts a typical 2-5 MB JPEG cover down to 100-250 KB and lets every
 * mobile client paint the poster in a single TCP window.
 */
async function compressImage(file: File, maxWidth = 2400, quality = 0.92): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = "convertToBlob" in canvas
      ? await (canvas as OffscreenCanvas).convertToBlob({ type: "image/webp", quality })
      : await new Promise((res) => (canvas as HTMLCanvasElement).toBlob(res, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

export function FileUpload({
  bucket, kind, accept, value, onChange, pathPrefix, label, description, maxBytes,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [meta, setMeta] = useState<{ size?: number; duration?: number; width?: number; height?: number } | null>(null);

  async function upload(rawFile: File) {
    // Higher fidelity for hero/cover art; smaller portrait cards stay lean.
    const isHeroLandscape = bucket === "film-thumbnails"; // 16:9 desktop hero
    const isCoverPortrait = bucket === "film-covers";      // 2:3 portrait + 9:16 mobile hero
    const maxWidth = isHeroLandscape ? 2400 : isCoverPortrait ? 2000 : 2400;
    const quality = isHeroLandscape ? 0.93 : isCoverPortrait ? 0.92 : 0.9;
    const file = kind === "image" ? await compressImage(rawFile, maxWidth, quality) : rawFile;
    if (maxBytes && file.size > maxBytes) {

      toast.error(`File too large — max ${fmtBytes(maxBytes)}`);
      return;
    }
    if (!accepts(file, accept)) {
      toast.error("Unsupported file format");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error("You are not signed in");
      return;
    }

    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

    setProgress(0);
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr || !signed) throw new Error(signErr?.message || "Could not generate URL");

      let duration: number | undefined;
      if (kind === "video") {
        duration = await new Promise<number | undefined>((res) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => res(isFinite(v.duration) ? v.duration : undefined);
          v.onerror = () => res(undefined);
          v.src = URL.createObjectURL(file);
        });
      }

      setMeta({ size: file.size, duration });
      onChange(signed.signedUrl);
      toast.success(`${label} uploaded`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void upload(f);
    e.target.value = "";
  }

  const hasFile = !!value;

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={progress !== null}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
          >
            {progress !== null
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5" />}
            {hasFile ? "Replace" : "Upload"}
          </button>
          {hasFile && progress === null && (
            <button
              type="button"
              onClick={() => { onChange(null); setMeta(null); }}
              className="inline-flex items-center rounded-md border border-border p-1.5 text-xs hover:bg-accent"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
      </div>

      {progress !== null && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Uploading… {progress}%</div>
        </div>
      )}

      {hasFile && progress === null && (
        <div className="mt-3 flex items-center gap-3">
          {kind === "image" ? (
            <img
              src={value!}
              alt=""
              className="h-20 w-14 rounded object-cover bg-muted"
              onLoad={(e) => {
                const img = e.currentTarget;
                setMeta((prev) => ({ ...(prev ?? {}), width: img.naturalWidth, height: img.naturalHeight }));
              }}
            />
          ) : (
            <video src={value!} className="h-20 w-32 rounded object-cover bg-muted" muted playsInline />
          )}
          <div className="text-xs text-muted-foreground space-y-0.5 min-w-0">
            <div className="text-foreground truncate">{decodeURIComponent(value!.split("/").pop()?.split("?")[0] || "uploaded")}</div>
            {meta?.size != null && <div>Size: {fmtBytes(meta.size)}</div>}
            {kind === "image" && meta?.width && meta?.height && (
              <div>{meta.width} × {meta.height}px</div>
            )}
            {kind === "video" && meta?.duration != null && <div>Duration: {fmtDur(meta.duration)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
