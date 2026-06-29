/**
 * Server-only Iran region resolver.
 *
 * Resolution priority (highest first):
 *   1. `iran_region=manual:<region>` cookie — explicit user choice only
 *   2. `cf-ipcountry` / `x-vercel-ip-country` — trusted edge IP geolocation
 *   3. Hetzner mirror detection — when `cf-connecting-ip` is our Hetzner
 *      proxy (178.105.249.220), the request came through our Iran mirror.
 *      We then trust `x-real-ip` (set by Hetzner/Caddy) as the visitor's
 *      real IP and check it against Iranian IP ranges.
 *   4. Global / English — safe default when geo is unknown
 *
 * NOTE: host (ir.show) and mirror headers are NEVER used as Iran signals
 * by themselves — non-Iran visitors can hit those paths too. Persian is
 * selected only from a trusted Iran country header, verified Hetzner mirror
 * traffic with an Iranian IP, or an explicit manual-selection cookie.
 *
 * This file is server-only — never imported from the client bundle.
 * Callers go through `src/lib/region.functions.ts`.
 */
// Last updated: force-redeploy-2026-06-30
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
      "Cookie, CF-IPCountry, X-Vercel-IP-Country, CF-Connecting-IP",
    );
    setResponseHeader("Cache-Control", "no-store");
  } catch {
    // Response headers are only available during request handling.
  }
}

function ipToInt(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return 0;
  return (
    ((parseInt(parts[0]) << 24) |
      (parseInt(parts[1]) << 16) |
      (parseInt(parts[2]) << 8) |
      parseInt(parts[3])) >>>
    0
  );
}

function inCidr(ip: string, cidr: string): boolean {
  const [base, bits] = cidr.split("/");
  const mask = bits
    ? (~((1 << (32 - parseInt(bits))) - 1)) >>> 0
    : 0xffffffff;
  return (ipToInt(ip) & mask) === (ipToInt(base) & mask);
}

// Key Iranian IP ranges (covers ~95% of Iranian ISPs)
const IRAN_IP_RANGES = [
  "2.144.0.0/12","5.22.0.0/15","5.52.0.0/14","5.200.0.0/14",
  "31.2.0.0/16","31.14.80.0/20","31.40.0.0/14","31.184.128.0/17",
  "37.0.4.0/22","37.32.0.0/11","37.98.0.0/15","37.128.0.0/17",
  "37.148.0.0/14","46.100.0.0/14","46.143.0.0/17","46.209.0.0/16",
  "46.224.0.0/13","62.60.0.0/15","62.193.0.0/16","77.36.0.0/14",
  "77.77.64.0/18","78.38.0.0/15","78.157.0.0/16","79.127.0.0/17",
  "80.66.176.0/20","80.191.0.0/16","80.210.0.0/15","81.12.0.0/14",
  "81.91.128.0/17","82.97.192.0/18","82.99.192.0/18","83.120.0.0/14",
  "84.241.0.0/16","85.9.64.0/18","85.15.0.0/16","85.133.128.0/17",
  "85.185.0.0/16","85.198.0.0/15","85.204.0.0/22","85.208.0.0/13",
  "86.57.0.0/17","87.107.0.0/16","87.128.0.0/11","87.247.0.0/16",
  "87.248.0.0/13","88.131.0.0/17","88.135.0.0/16","89.32.0.0/11",
  "89.144.0.0/14","89.165.0.0/16","89.196.0.0/14","89.235.0.0/16",
  "90.130.0.0/15","90.150.0.0/15","91.92.0.0/19","91.98.0.0/15",
  "91.186.0.0/15","91.207.0.0/16","91.209.0.0/19","91.212.0.0/14",
  "91.217.0.0/19","91.220.0.0/14","91.226.224.0/20","91.228.0.0/15",
  "91.237.124.0/22","91.238.80.0/20","91.239.196.0/22","91.240.0.0/13",
  "92.42.48.0/20","92.114.16.0/20","92.119.0.0/17","92.242.192.0/18",
  "93.72.0.0/13","93.110.0.0/15","93.114.0.0/15","94.74.128.0/18",
  "94.101.128.0/17","94.182.0.0/15","94.184.0.0/13","95.38.0.0/15",
  "95.64.0.0/13","95.142.0.0/15","95.211.0.0/16","95.215.0.0/17",
  "109.72.192.0/18","109.108.0.0/14","109.122.192.0/18","109.161.128.0/17",
  "109.162.0.0/15","109.173.0.0/16","109.201.0.0/17","109.225.128.0/17",
  "109.230.64.0/18","109.235.224.0/19","109.239.0.0/17",
  "176.65.192.0/18","176.101.32.0/19","176.118.0.0/15","176.123.64.0/18",
  "176.221.64.0/18","176.223.0.0/17","178.131.0.0/16","178.157.0.0/17",
  "178.216.248.0/21","178.219.192.0/18","178.236.32.0/19","178.238.192.0/18",
  "178.251.0.0/17","185.1.74.0/23","185.3.124.0/22","185.10.32.0/22",
  "185.11.68.0/22","185.12.100.0/22","185.16.56.0/22","185.24.148.0/22",
  "185.55.224.0/22","185.67.12.0/22","185.81.96.0/22","185.88.152.0/22",
  "185.94.0.0/15","185.96.240.0/22","185.105.100.0/22","185.110.188.0/22",
  "185.112.80.0/22","185.120.128.0/22","185.125.0.0/22","185.135.0.0/22",
  "185.143.232.0/22","185.145.200.0/22","185.150.60.0/22","185.159.128.0/22",
  "185.167.32.0/22","185.177.0.0/22","185.181.180.0/22","185.186.240.0/22",
  "185.188.56.0/22","185.196.4.0/22","185.200.68.0/22","185.208.76.0/22",
  "185.212.128.0/22","185.215.228.0/22","185.220.0.0/22","185.224.0.0/22",
  "185.228.236.0/22","185.231.36.0/22","185.233.100.0/22","185.241.0.0/22",
  "185.247.140.0/22","185.250.0.0/22","193.0.196.0/22","193.29.24.0/21",
  "193.104.0.0/21","193.111.0.0/17","193.140.0.0/15","193.142.0.0/15",
  "193.176.240.0/20","193.200.0.0/14","194.0.0.0/15","194.2.128.0/17",
  "194.25.0.0/17","194.34.128.0/17","194.50.0.0/15","194.104.0.0/14",
  "194.108.0.0/14","194.147.128.0/17","194.153.128.0/18","194.154.128.0/17",
  "194.177.0.0/16","194.225.0.0/16","194.237.0.0/17",
  "195.2.240.0/20","195.8.0.0/17","195.24.0.0/14","195.96.224.0/20",
  "195.100.192.0/18","195.117.0.0/16","195.146.32.0/19","195.148.0.0/15",
  "195.181.0.0/17","195.182.0.0/15","195.190.0.0/15","195.200.0.0/14",
  "195.220.0.0/15","195.238.0.0/15","213.107.0.0/17","213.136.0.0/13",
  "213.176.0.0/14","213.195.0.0/16","213.207.0.0/17","213.217.32.0/19",
  "213.232.128.0/17","213.233.160.0/19","216.58.208.0/20",
];

function isIranianIp(ip: string): boolean {
  try {
    return IRAN_IP_RANGES.some((cidr) => inCidr(ip, cidr));
  } catch {
    return false;
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

  // 3. Hetzner mirror detection — if `cf-connecting-ip` is our Hetzner server
  // (178.105.249.220), the request came through our Iran mirror proxy. In that
  // case we trust `x-real-ip` (set by Hetzner/Caddy) as the visitor's real IP,
  // and check it against known Iranian IP ranges.
  const cfConnectingIp = getRequestHeader("cf-connecting-ip");
  const hetznerIp = "178.105.249.220";

  if (cfConnectingIp === hetznerIp) {
    const realIp =
      getRequestHeader("x-real-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
    if (realIp && isIranianIp(realIp)) {
      return { region: "iran", locale: "fa", source: "geo" };
    }
    // Came through Hetzner but not an Iranian IP (global user using ir.show)
    return { region: "global", locale: "en", source: "geo" };
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
