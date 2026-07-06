// Server-only helper: turn a stored Supabase signed-object URL into a
// transform-signed render URL at the requested width/quality. Caches
// per-call to avoid duplicate sign requests.

const ONE_YEAR = 60 * 60 * 24 * 365;

export function parseSignedObjectUrl(
  u: string | null | undefined,
): { bucket: string; path: string } | null {
  if (!u) return null;
  const m = u.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
}

export function makeRenderCache() {
  return new Map<string, Promise<string | null>>();
}

export async function renderResizedUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  cache: Map<string, Promise<string | null>>,
  original: string | null | undefined,
  width: number,
  quality = 90,
): Promise<string | null> {
  if (!original) return null;
  const parsed = parseSignedObjectUrl(original);
  if (!parsed) return original;
  const key = `${parsed.bucket}|${parsed.path}|${width}|${quality}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const { data, error } = await client.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, ONE_YEAR, {
          transform: { width, quality, resize: "cover" as const },
        });
      if (error || !data?.signedUrl) return original;
      return data.signedUrl as string;
    } catch {
      return original;
    }
  })();
  cache.set(key, promise);
  return promise;
}
