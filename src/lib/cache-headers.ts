import { createIsomorphicFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export const setHomepageCacheHeaders = createIsomorphicFn()
  .client(() => {})
  .server(() => {
    try {
      setResponseHeader(
        "Cache-Control",
        "public, s-maxage=120, stale-while-revalidate=600",
      );
      setResponseHeader("Vary", "Accept-Language, Cookie, CF-IPCountry");
    } catch {
      // Only valid inside an active server request; ignore otherwise.
    }
  });
