import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin role required");
}

export const getFilmVideoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("films")
      .select("video_url")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { videoUrl: (row?.video_url as string | null) ?? null };
  });

export const setFilmVideoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; videoUrl: string | null }) =>
    z.object({
      id: z.string().uuid(),
      videoUrl: z.string().max(2048).nullable(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("films")
      .update({ video_url: data.videoUrl })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const subtitleTrackSchema = z.object({
  lang: z.string().min(1).max(16),
  label: z.string().min(1).max(80),
  url: z.string().min(1).max(2048),
  default: z.boolean().optional(),
});

export const getFilmSubtitles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("films")
      .select("subtitles")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const raw = (row as { subtitles?: unknown } | null)?.subtitles;
    const subs = Array.isArray(raw)
      ? raw.filter((t): t is z.infer<typeof subtitleTrackSchema> => {
          const r = subtitleTrackSchema.safeParse(t);
          return r.success;
        })
      : [];
    return { subtitles: subs };
  });

export const setFilmSubtitles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; subtitles: unknown }) =>
    z.object({
      id: z.string().uuid(),
      subtitles: z.array(subtitleTrackSchema).max(20),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure at most one default track.
    let seenDefault = false;
    const cleaned = data.subtitles.map((t) => {
      const isDef = !!t.default && !seenDefault;
      if (isDef) seenDefault = true;
      return { lang: t.lang, label: t.label, url: t.url, default: isDef };
    });
    const { error } = await supabaseAdmin
      .from("films")
      .update({ subtitles: cleaned })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFilmsWithVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("films")
      .select("id")
      .not("video_url", "is", null);
    if (error) throw new Error(error.message);
    return { ids: (data ?? []).map((r: { id: string }) => r.id) };
  });

