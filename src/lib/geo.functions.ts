import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Detect the visitor's region from request headers.
 * Returns "iran" when the request comes from Iran, otherwise "global".
 * Returns null when the country cannot be determined (e.g. local dev with
 * no Cloudflare headers) — caller should fall back to manual selection.
 */
export const detectVisitorRegion = createServerFn({ method: "GET" }).handler(
  async () => {
    const country =
      getRequestHeader("cf-ipcountry") ??
      getRequestHeader("x-vercel-ip-country") ??
      getRequestHeader("x-country-code") ??
      null;

    if (!country || country === "XX" || country === "T1") {
      return { region: null as "iran" | "global" | null, country: null };
    }

    const region: "iran" | "global" = country.toUpperCase() === "IR" ? "iran" : "global";
    return { region, country: country.toUpperCase() };
  },
);
