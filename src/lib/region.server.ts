/**
 * Server-only Iran region resolver.
 *
 * Resolution priority (highest first):
 *   1. `iran_region=manual:<region>` cookie — explicit user choice only
 *   2. `cf-ipcountry` / `x-vercel-ip-country` — trusted edge IP geolocation
 *   3. `x-iran-mirror` / `x-country-code` — Hetzner reverse proxy, injected
 *      only for verified Iranian IP ranges (Caddy IP matching)
 *   4. Global / English — safe default when geo is unknown
 *
 * NOTE: host (ir.show) and mirror headers are NEVER used as Iran signals
 * by themselves — non-Iran visitors can hit those paths too. Persian is
 * selected only from a trusted Iran country header, the verified Hetzner
 * mirror header, or an explicit manual-selection cookie.
 *
 * This file is server-only — never imported from the client bundle.
 * Callers go through `src/lib/region.functions.ts`.
 */
import {
  getCookie,
  getRequestHeader,
  setResponseHeader,
  setCookie,
} from "@tanstack/react-start/server";

export type Region = "iran" | "global";
export type Locale = "en" | "fa";

export const REGION_COOKIE = "iran_region";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type ResolvedRegion = {
  region: Region | null;
  locale: Locale;
  source: "cookie" | "geo" | "default";
};

function normalizeCountry(country: string | null | undefined): string | null {
  const value = country?.trim().toUpperCase();
  if (!value || value === "XX" || value === "T1") return null;
  return value;
}

function readTrustedCountry(): string | null {
  return normalizeCountry(
    getRequestHeader("cf-ipcountry") ?? getRequestHeader("x-vercel-ip-country"),
  );
}

function readManualRegionCookie(): Region | null {
  const cookie = getCookie(REGION_COOKIE);
  if (cookie === "manual:iran") return "iran";
  if (cookie === "manual:global") return "global";

  // Legacy plain values were previously written by automatic detection too,
  // so they are not reliable proof of a manual user choice. Ignore them to
  // prevent stale `iran_region=iran` cookies from forcing Persian globally.
  return null;
}

function applyRegionResponseHeaders(): void {
  try {
    setResponseHeader(
      "Vary",
      "Cookie, CF-IPCountry, X-Vercel-IP-Country, X-Iran-Mirror",
    );
    setResponseHeader("Cache-Control", "no-store");
  } catch {
    // Response headers are only available during request handling.
  }
}

/** Read the cookie and headers and decide on a region. Pure read — no side effects. */
export function readRegion(): ResolvedRegion {
  applyRegionResponseHeaders();

  // 1. Manual-selection cookie wins. Only the `manual:*` format is trusted;
  // old plain cookies may have been created by automatic detection.
  const manualCookie = readManualRegionCookie();
  if (manualCookie) {
    return {
      region: manualCookie,
      locale: manualCookie === "iran" ? "fa" : "en",
      source: "cookie",
    };
  }

  // 2. Trusted edge geo (Cloudflare/Vercel).
  const country = readTrustedCountry();
  if (country) {
    if (country === "IR") return { region: "iran", locale: "fa", source: "geo" };
    return { region: "global", locale: "en", source: "geo" };
  }

  // 3. Hetzner mirror header — only injected for verified Iranian IPs
  // by the Caddy reverse proxy (IP range matching). Safe third fallback
  // because the manual cookie and Cloudflare/Vercel geo were checked first.
  const irMirror = getRequestHeader("x-iran-mirror");
  if (irMirror === "1") {
    return { region: "iran", locale: "fa", source: "geo" };
  }

  // 4. Unknown — default to global / English.
  return { region: "global", locale: "en", source: "default" };
}

/**
 * Resolve the region for this request. Automatic detection intentionally does
 * NOT write a cookie: saved preferences must come only from a manual user
 * selection, otherwise one stale Iran detection can force Persian forever.
 */
export function resolveAndPersistRegion(): ResolvedRegion {
  return readRegion();
}

export function writeRegionCookie(region: Region): void {
  setCookie(REGION_COOKIE, `manual:${region}`, {
    maxAge: ONE_YEAR,
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
}
