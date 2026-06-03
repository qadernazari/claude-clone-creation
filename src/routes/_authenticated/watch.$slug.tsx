import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { Logo } from "@/components/logo";
import { AuthMenu } from "@/components/auth-menu";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/watch/$slug")({
  loader: async ({ params }) => {
    const { data: film, error } = await supabase
      .from("films")
      .select("id, slug, title_en, title_fa, director_en, director_fa, video_url, visibility, ticket_hours")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!film || film.visibility !== "published") throw notFound();
    return { film };
  },
  component: WatchPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">{error.message}</p>
          <button
            onClick={() => { reset(); router.invalidate(); }}
            className="text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => {
    const { slug } = Route.useParams();
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl">Film not found</h1>
          <p className="mt-2 text-sm text-cream/60">/{slug}</p>
          <Link to="/" className="mt-4 inline-block text-sm underline">Back to home</Link>
        </div>
      </div>
    );
  },
});

function WatchPage() {
  const { film } = Route.useLoaderData();
  const { locale, num, dir } = useLocale();
  const fa = locale === "fa";

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", film.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, expires_at")
        .eq("film_id", film.id)
        .eq("status", "paid")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (ticket) {
      supabase.from("events").insert({ type: "play", film_id: film.id }).then(() => {});
    }
  }, [ticket, film.id]);

  const title = fa ? film.title_fa || film.title_en : film.title_en;
  const director = fa ? film.director_fa || film.director_en : film.director_en;

  const t = {
    back: fa ? "بازگشت به فیلم" : "Back to film",
    noTicket: fa ? "بلیط فعالی برای این فیلم ندارید." : "You don't have an active ticket for this film.",
    buyOne: fa ? "خرید بلیط" : "Buy a ticket",
    missing: fa ? "ویدئو هنوز در دسترس نیست." : "Video is not available yet.",
    expiresAt: fa ? "دسترسی تا" : "Access until",
    loading: fa ? "در حال بررسی بلیط…" : "Checking your ticket…",
  };

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-cream/10 bg-bg-0/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center" aria-label="IRAN — home">
            <Logo size={36} />
          </Link>
          <AuthMenu />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/films/$slug"
          params={{ slug: film.slug }}
          className="text-xs text-cream/60 hover:text-cream-bright"
        >
          ← {t.back}
        </Link>

        <h1 className={`mt-4 text-2xl md:text-3xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
          {title}
        </h1>
        {director && (
          <p className="mt-1 text-sm text-cream/60">
            {fa ? "کارگردان: " : "Directed by "}{director}
          </p>
        )}

        <div className="mt-6 hairline overflow-hidden rounded-xl border bg-black aspect-video">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-cream/60">
              {t.loading}
            </div>
          ) : !ticket ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
              <p className="text-sm text-cream/80">{t.noTicket}</p>
              <Link
                to="/films/$slug"
                params={{ slug: film.slug }}
                className="rounded-md bg-amber px-4 py-2 text-sm font-medium text-bg-0 hover:bg-amber/90"
              >
                {t.buyOne}
              </Link>
            </div>
          ) : !film.video_url ? (
            <div className="flex h-full items-center justify-center text-sm text-cream/60">
              {t.missing}
            </div>
          ) : (
            <video
              src={film.video_url}
              controls
              playsInline
              controlsList="nodownload"
              className="h-full w-full"
            />
          )}
        </div>

        {ticket?.expires_at && (
          <p className="mt-3 text-xs text-cream/55">
            {t.expiresAt}{" "}
            <time dateTime={ticket.expires_at}>
              {new Date(ticket.expires_at).toLocaleString(fa ? "fa-IR" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
            {" · "}{num(film.ticket_hours)}h
          </p>
        )}
      </main>
    </div>
  );
}
