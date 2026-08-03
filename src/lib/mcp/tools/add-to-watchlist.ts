import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_to_watchlist",
  title: "Add film to my watchlist",
  description: "Save an IRAN film to the signed-in member's watchlist, by film slug.",
  inputSchema: { slug: z.string().trim().min(1).describe("Slug of the film to save.") },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
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
    const { error } = await supabase
      .from("watchlist")
      .upsert({ user_id: ctx.getUserId()!, film_id: film.id }, { onConflict: "user_id,film_id" });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Added "${film.title_en}" to your watchlist.` }],
      structuredContent: { slug, film_id: film.id },
    };
  },
});
