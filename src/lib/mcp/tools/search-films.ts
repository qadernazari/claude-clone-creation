import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const FIELDS =
  "id, slug, title_en, title_fa, synopsis_en, category, year, duration_min, film_type, access_type, is_premium, price_toman";

export default defineTool({
  name: "search_films",
  title: "Search films",
  description:
    "Search the IRAN catalog of Iranian films and walking tours by title, optionally filtered by category.",
  inputSchema: {
    query: z.string().trim().optional().describe("Text to match against the film title."),
    category: z.string().trim().optional().describe("Category id, for example 'walking-tour'."),
    limit: z.number().int().optional().describe("Max results, default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("films")
      .select(FIELDS)
      .eq("visibility", "public")
      .is("parent_film_id", null)
      .order("sort_order", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 20, 1), 50));
    if (query) q = q.or(`title_en.ilike.%${query}%,title_fa.ilike.%${query}%`);
    if (category) q = q.eq("category", category);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { films: data ?? [] },
    };
  },
});
