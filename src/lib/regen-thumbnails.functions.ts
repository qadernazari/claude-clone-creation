import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Transform variants we serve on the homepage. Warming these forces the
// Supabase image CDN to render + cache each size from the stored original,
// so real visitors get a hot cache on their first request.
const HERO_VARIANTS = [
  { width: 1080, quality: 86 },
  { width: 1280, quality: 88 },
  { width: 1920, quality: 90 },
  { width: 2400, quality: 90 },
] as const;

const RAIL_VARIANTS = [
  { width: 520, height: 293, quality: 84 },
  { width: 760, height: 428, quality: 86 },
  { width: 1040, height: 585, quality: 86 },
] as const;

function parseSignedObjectUrl(u: string | null | undefined) {
  if (!u) return null;
  const m = u.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
}

export type RegenReport = {
  scanned: number;
  warmed: number;
  errors: number;
  lowRes: Array<{
    slug: string;
    title: string;
    field: "thumbnail_url" | "cover_url";
    width: number;
    height: number;
  }>;
  log: string[];
};

async function assertAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin role required");
}

/**
 * Rebuild the CDN cache for every published film's hero + rail images at the
 * sizes the homepage requests. For each stored original this:
 *   1. Measures the true pixel dimensions (server-side, no browser).
 *   2. Requests each transform variant so Supabase's image CDN renders and
 *      caches it. Real visitors then hit a warm cache.
 *   3. Flags originals whose width is below the largest variant so an admin
 *      knows which films still need a genuine high-res re-upload.
 */
export const regenHomeThumbnails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegenReport> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: films, error } = await supabaseAdmin
      .from("films")
      .select("slug, title_en, cover_url, thumbnail_url")
      .eq("visibility", "published")
      .neq("film_type", "episode")
      .limit(500);
    if (error) throw new Error(error.message);

    const report: RegenReport = { scanned: 0, warmed: 0, errors: 0, lowRes: [], log: [] };
    const push = (line: string) => {
      report.log.push(line);
      if (report.log.length > 400) report.log.shift();
    };

    // Cheap size probe: read the first bytes of the stored object and pull
    // dimensions out of the header. Falls back silently if the type is
    // unrecognized (we still warm the variants, we just skip the low-res flag).
    async function probeDimensions(bucket: string, path: string): Promise<{ w: number; h: number } | null> {
      try {
        const { data: signed } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 60);
        if (!signed?.signedUrl) return null;
        const res = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-65535" } });
        if (!res.ok && res.status !== 206) return null;
        const buf = new Uint8Array(await res.arrayBuffer());
        return readImageSize(buf);
      } catch {
        return null;
      }
    }

    async function warmVariant(
      bucket: string,
      path: string,
      width: number,
      quality: number,
      height?: number,
    ) {
      try {
        const transform: {
          width: number;
          height?: number;
          quality: number;
          resize: "contain" | "cover";
        } = { width, quality, resize: height ? "cover" : "contain" };
        if (height) transform.height = height;
        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, ONE_YEAR, { transform });
        if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || "sign failed");
        // HEAD is enough to make the CDN materialize + cache the render.
        const res = await fetch(signed.signedUrl, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        report.warmed += 1;
      } catch (e) {
        report.errors += 1;
        push(`  warm ${width}x${height ?? "?"} failed: ${(e as Error).message}`);
      }
    }

    for (const f of films ?? []) {
      const slug = (f.slug as string) ?? "";
      const title = (f.title_en as string) ?? slug;
      push(`• ${title}`);

      const targets: Array<{ field: "thumbnail_url" | "cover_url"; url: string }> = [];
      if (f.thumbnail_url) targets.push({ field: "thumbnail_url", url: f.thumbnail_url as string });
      if (f.cover_url) targets.push({ field: "cover_url", url: f.cover_url as string });

      for (const t of targets) {
        const parsed = parseSignedObjectUrl(t.url);
        if (!parsed) {
          push(`  skipped ${t.field} — not a Supabase signed URL`);
          continue;
        }
        report.scanned += 1;

        const dims = await probeDimensions(parsed.bucket, parsed.path);
        if (dims) {
          push(`  ${t.field} original ${dims.w}×${dims.h}`);
          if (dims.w < 1600) {
            report.lowRes.push({ slug, title, field: t.field, width: dims.w, height: dims.h });
          }
        } else {
          push(`  ${t.field} original size unknown`);
        }

        const variants = t.field === "thumbnail_url" ? RAIL_VARIANTS : HERO_VARIANTS;
        for (const v of variants) {
          await warmVariant(
            parsed.bucket,
            parsed.path,
            v.width,
            v.quality,
            "height" in v ? v.height : undefined,
          );
        }
        // Also warm hero-size renders off the thumbnail (the homepage hero
        // renders the landscape thumbnail at 1080/1280/1920/2400 wide).
        if (t.field === "thumbnail_url") {
          for (const v of HERO_VARIANTS) {
            await warmVariant(parsed.bucket, parsed.path, v.width, v.quality);
          }
        }
      }
    }

    push(
      `Done — scanned ${report.scanned} images, warmed ${report.warmed} variants, ${report.errors} errors, ${report.lowRes.length} low-res originals.`,
    );
    return report;
  });

// -------- image header parsing --------

function readImageSize(buf: Uint8Array): { w: number; h: number } | null {
  // PNG: 8-byte signature, then IHDR chunk with width/height at bytes 16..24
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return { w: dv.getUint32(16), h: dv.getUint32(20) };
  }
  // GIF
  if (buf.length >= 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    const w = buf[6] | (buf[7] << 8);
    const h = buf[8] | (buf[9] << 8);
    return { w, h };
  }
  // WebP (RIFF....WEBP)
  if (
    buf.length >= 30 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    const fourcc = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);
    if (fourcc === "VP8 ") {
      const w = (buf[26] | (buf[27] << 8)) & 0x3fff;
      const h = (buf[28] | (buf[29] << 8)) & 0x3fff;
      return { w, h };
    }
    if (fourcc === "VP8L") {
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      const w = 1 + (((b1 & 0x3f) << 8) | b0);
      const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { w, h };
    }
    if (fourcc === "VP8X" && buf.length >= 30) {
      const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { w, h };
    }
  }
  // JPEG: scan SOF markers
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      let marker = buf[i + 1];
      while (marker === 0xff && i + 1 < buf.length) { i += 1; marker = buf[i + 1]; }
      i += 2;
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const h = (buf[i + 3] << 8) | buf[i + 4];
        const w = (buf[i + 5] << 8) | buf[i + 6];
        return { w, h };
      }
      const segLen = (buf[i] << 8) | buf[i + 1];
      if (segLen < 2) return null;
      i += segLen;
    }
  }
  return null;
}
