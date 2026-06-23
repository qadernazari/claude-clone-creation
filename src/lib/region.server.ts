/**
 * Server-only Iran region resolver.
 *
 * Resolution priority (highest first):
 *   1. `iran_region` cookie — explicit user choice persists across visits
 *   2. `x-iran-mirror` header — set by the Hetzner Caddy mirror (Iran traffic)
 *   3. `cf-ipcountry` / `x-vercel-ip-country` — IP geolocation
 *   4. Global / English — safe default when geo is unknown
 *
 * NOTE: host (ir.show) is NEVER used as an Iran signal — non-Iran visitors
 * hit that domain too. Only the Iran VPS mirror should force Iran, and it
 * sets `x-iran-mirror` explicitly.
 *
 * This file is server-only — never imported from the client bundle.
 * Callers go through `src/lib/region.functions.ts`.
 */
import {
  getCookie,
  getRequestHeader,
  setCookie,
} from "@tanstack/react-start/server";

export type Region = "iran" | "global";
export type Locale = "en" | "fa";

export const REGION_COOKIE = "iran_region";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type ResolvedRegion = {
  region: Region | null;
  locale: Locale;
  source: "cookie" | "mirror-header" | "geo" | "default";
};

/** Read the cookie and headers and decide on a region. Pure read — no side effects. */
export function readRegion(): ResolvedRegion {
  // 1. cookie wins — explicit user choice
  const cookie = getCookie(REGION_COOKIE);
  if (cookie === "iran" || cookie === "global") {
    return { region: cookie, locale: cookie === "iran" ? "fa" : "en", source: "cookie" };
  }

  // 2. explicit mirror signal forwarded by the Iran VPS Caddy
  const mirrorHeader = getRequestHeader("x-iran-mirror");
  if (mirrorHeader && mirrorHeader !== "0" && mirrorHeader !== "false") {
    return { region: "iran", locale: "fa", source: "mirror-header" };
  }

  // 3. edge geo (Cloudflare / Vercel)
  const country = (
    getRequestHeader("cf-ipcountry") ??
    getRequestHeader("x-vercel-ip-country") ??
    getRequestHeader("x-country-code") ??
    ""
  ).toUpperCase();
  if (country && country !== "XX" && country !== "T1") {
    if (country === "IR") return { region: "iran", locale: "fa", source: "geo" };
    return { region: "global", locale: "en", source: "geo" };
  }

  // 4. unknown — default to global / English
  return { region: "global", locale: "en", source: "default" };
}

/**
 * Resolve and (if missing) persist the region cookie so subsequent visits
 * are decided instantly without re-running header logic.
 */
export function resolveAndPersistRegion(): ResolvedRegion {
  const result = readRegion();
  if (result.source !== "cookie" && result.region) {
    try {
      setCookie(REGION_COOKIE, result.region, {
        maxAge: ONE_YEAR,
        path: "/",
        sameSite: "lax",
        secure: true,
        httpOnly: false, // client can read for symmetry; not security-sensitive
      });
    } catch {
      // setCookie outside a request context throws — ignore in non-SSR paths.
    }
  }
  return result;
}

export function writeRegionCookie(region: Region): void {
  setCookie(REGION_COOKIE, region, {
    maxAge: ONE_YEAR,
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
}
