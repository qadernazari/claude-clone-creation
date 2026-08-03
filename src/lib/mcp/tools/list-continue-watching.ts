import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_continue_watching",
  title: "List continue watching",
  description:
    "List the signed-in member's in-progress IRAN films with playback position and duration.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("watch_progress")
      .select(
        "position_seconds, duration_seconds, completed, last_watched_at, films(slug, title_en, title_fa)",
      )
      .eq("completed", false)
      .order("last_watched_at", { ascending: false })
      .limit(20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
