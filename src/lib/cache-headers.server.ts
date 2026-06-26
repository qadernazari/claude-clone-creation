import { setResponseHeader } from "@tanstack/react-start/server";

export function setHomepageCacheHeaders() {
  try {
    setResponseHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    setResponseHeader("Vary", "Accept-Language, Cookie, CF-IPCountry");
  } catch {
    // Only valid inside an active server request; ignore otherwise.
  }
}
