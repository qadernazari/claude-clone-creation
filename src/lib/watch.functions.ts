import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Result = { videoUrl: string | null } | { error: string };

export const getFilmStreamUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) =>
    z.object({
      slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
    }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Result> => {
    try {
      const { supabase, userId } = context;

      // Verify the film exists and is published (RLS-scoped read).
      const { data: film, error: filmErr } = await supabase
        .from("films")
        .select("id, visibility")
        .eq("slug", data.slug)
        .maybeSingle();
      if (filmErr) throw new Error(filmErr.message);
      if (!film || film.visibility !== "published") {
        return { error: "Film not available" };
      }

      // Verify the user has an active paid ticket for this film.
      const { data: ticket, error: ticketErr } = await supabase
        .from("tickets")
        .select("id")
        .eq("film_id", film.id)
        .eq("user_id", userId)
        .eq("status", "paid")
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      if (ticketErr) throw new Error(ticketErr.message);
      if (!ticket) return { error: "No active ticket" };

      // Fetch video_url with elevated privileges (column is hidden from clients).
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error: urlErr } = await supabaseAdmin
        .from("films")
        .select("video_url")
        .eq("id", film.id)
        .maybeSingle();
      if (urlErr) throw new Error(urlErr.message);

      return { videoUrl: row?.video_url ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to load stream" };
    }
  });
