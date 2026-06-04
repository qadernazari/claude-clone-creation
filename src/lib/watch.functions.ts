import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Result = { videoUrl: string | null } | { error: string };

export const getFilmStreamUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string; environment?: "sandbox" | "live" }) =>
    z.object({
      slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
      environment: z.enum(["sandbox", "live"]).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Result> => {
    try {
      const { supabase, userId } = context;

      // Verify the film exists and is published (RLS-scoped read).
      const { data: film, error: filmErr } = await supabase
        .from("films")
        .select("id, visibility, access_type")
        .eq("slug", data.slug)
        .maybeSingle();
      if (filmErr) throw new Error(filmErr.message);
      if (!film || film.visibility !== "published") {
        return { error: "Film not available" };
      }

      // Access rules:
      // - free → anyone signed in can watch
      // - membership / membership_or_ppv → active subscription OR (for *_or_ppv) valid ticket
      // - ppv_only → valid ticket only
      let allowed = false;
      const accessType = (film as { access_type?: string }).access_type ?? "membership";

      if (accessType === "free") {
        allowed = true;
      }

      if (!allowed && accessType !== "ppv_only") {
        const env = data.environment ?? "live";
        const { data: subRow, error: subErr } = await supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("user_id", userId)
          .eq("environment", env)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (subErr) throw new Error(subErr.message);
        if (subRow) {
          const futureEnd = !subRow.current_period_end || new Date(subRow.current_period_end as string) > new Date();
          if (["active", "trialing", "past_due"].includes(subRow.status as string) && futureEnd) allowed = true;
          if ((subRow.status as string) === "canceled" && futureEnd) allowed = true;
        }
      }

      if (!allowed && accessType !== "ppv_only") {
        // Active free trial grants membership-level access
        const { data: trialRow } = await supabase
          .from("trials")
          .select("status, ends_at")
          .eq("user_id", userId)
          .eq("status", "active")
          .gt("ends_at", new Date().toISOString())
          .maybeSingle();
        if (trialRow) allowed = true;
      }

      if (!allowed) {
        // Fall back to ticket check (covers ppv_only and membership_or_ppv non-members).
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
        if (ticket) allowed = true;
      }

      if (!allowed) return { error: "No access to this film" };

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
