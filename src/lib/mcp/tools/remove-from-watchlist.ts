import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "remove_from_watchlist",
  title: "Remove film from my watchlist",
  description: "Remove an IRAN film from the signed-in member's watchlist, by film slug.",
  inputSchema: { slug: z.string().trim().min(1).describe("Slug of the film to remove.") },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: film, error: filmError } = await supabase
      .from("films")
      .select("id, title_en")
      .eq("slug", slug)
      .maybeSingle();
    if (filmError) return { content: [{ type: "text", text: filmError.message }], isError: true };
    if (!film) {
      return { content: [{ type: "text", text: `No film found for slug "${slug}".` }], isError: true };
    }
    const { error } = await supabase.from("watchlist").delete().eq("film_id", film.id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Removed "${film.title_en}" from your watchlist.` }],
      structuredContent: { slug, film_id: film.id },
    };
  },
});
