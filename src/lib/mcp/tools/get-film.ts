import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_film",
  title: "Get film details",
  description: "Fetch full details for one IRAN film or walking tour by its slug.",
  inputSchema: { slug: z.string().trim().min(1).describe("Film slug, e.g. 'tehran-nights'.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("films")
      .select(
        "id, slug, title_en, title_fa, synopsis_en, synopsis_fa, director_en, director_fa, category, year, duration_min, language, age_rating, film_type, access_type, is_premium, price_toman, has_subtitles, has_captions, has_4k",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: `No film found for slug "${slug}".` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { film: data },
    };
  },
});
