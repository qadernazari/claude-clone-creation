import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { makeRenderCache, renderResizedUrl } from "./storage-render.server";

/**
 * Returns a 1200w / quality 75 resized version of a Supabase signed
 * storage URL for use in og:image / twitter:image tags. Same render
 * endpoint the homepage hero uses — keeps share previews fast and
 * uniformly sized across the site.
 */
export const getResizedOgImage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ url: z.string().nullable().optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<string | null> => {
    if (!data.url) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cache = makeRenderCache();
    return renderResizedUrl(supabaseAdmin, cache, data.url, 1200, 75);
  });
