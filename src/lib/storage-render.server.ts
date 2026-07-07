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
  _client: any,
  _cache: Map<string, Promise<string | null>>,
  original: string | null | undefined,
  _width: number,
  _quality = 90,
): Promise<string | null> {
  // Serve original uploaded file — no transform, no re-encode.
  return original ?? null;
}
