import { createServerFn } from "@tanstack/react-start";

/**
 * Persist the user's manual region choice as an HTTP cookie so the SSR
 * layer can read it on the next request and render the correct locale on
 * first paint (no flash of wrong language).
 */
export const setRegionPreference = createServerFn({ method: "POST" })
  .inputValidator((data: { region: "iran" | "global" }) => {
    if (data.region !== "iran" && data.region !== "global") {
      throw new Error("Invalid region");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { writeRegionCookie } = await import("./region.server");
    writeRegionCookie(data.region);
    return { ok: true, region: data.region };
  });

/**
 * Resolve the visitor's region from the current request (cookie / mirror
 * header / host / edge geo). Used by the root SSR shell to decide initial
 * <html lang dir> and by the mirror banner to know whether to nudge.
 */
export const resolveVisitorRegion = createServerFn({ method: "GET" }).handler(
  async () => {
    const { resolveAndPersistRegion } = await import("./region.server");
    const r = resolveAndPersistRegion();
    return { region: r.region, locale: r.locale, source: r.source };
  },
);
