import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/_authenticated/my-tickets")({
  component: MyTicketsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    console.error("my-tickets error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
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
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
      <p className="text-sm">Not found</p>
    </div>
  ),
});

type TicketRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  film: {
    slug: string;
    title_en: string;
    title_fa: string | null;
    cover_url: string | null;
    ticket_hours: number;
  } | null;
};

function MyTicketsPage() {
  const { locale, num, dir } = useLocale();
  const fa = locale === "fa";

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, status, amount, currency, paid_at, expires_at, created_at, film:films(slug, title_en, title_fa, cover_url, ticket_hours)"
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as unknown as TicketRow[]) ?? [];
    },
  });

  const now = Date.now();

  const t = {
    title: fa ? "بلیط‌های من" : "My tickets",
    sub: fa ? "تمام خریدهای شما" : "All your purchases",
    empty: fa ? "هنوز بلیطی نخریده‌اید." : "You haven't bought any tickets yet.",
    browse: fa ? "مشاهده فیلم‌ها" : "Browse films",
    watch: fa ? "تماشا" : "Watch",
    expired: fa ? "منقضی شده" : "Expired",
    pending: fa ? "در انتظار پرداخت" : "Pending",
    paid: fa ? "پرداخت‌شده" : "Paid",
    refunded: fa ? "بازگشت داده شده" : "Refunded",
    expiresAt: fa ? "تا" : "Until",
    purchasedAt: fa ? "خرید در" : "Purchased",
    loading: fa ? "در حال بارگذاری…" : "Loading…",
  };

  function statusLabel(s: string, exp: string | null) {
    if (s === "paid" && exp && new Date(exp).getTime() < now) return t.expired;
    if (s === "paid") return t.paid;
    if (s === "pending") return t.pending;
    if (s === "refunded") return t.refunded;
    return s;
  }

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className={`text-3xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-cream/60">{t.sub}</p>

        {isLoading ? (
          <p className="mt-10 text-sm text-cream/60">{t.loading}</p>
        ) : tickets.length === 0 ? (
          <div className="mt-10 hairline rounded-xl border bg-bg-1/60 p-8 text-center">
            <p className="text-cream/80">{t.empty}</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-md bg-amber px-4 py-2 text-sm font-medium text-bg-0 hover:bg-amber/90"
            >
              {t.browse}
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {tickets.map((tk) => {
              const exp = tk.expires_at ? new Date(tk.expires_at) : null;
              const active = tk.status === "paid" && exp && exp.getTime() > now;
              const title = tk.film
                ? fa
                  ? tk.film.title_fa || tk.film.title_en
                  : tk.film.title_en
                : "—";
              return (
                <li
                  key={tk.id}
                  className="hairline rounded-xl border bg-bg-1/50 p-4 md:p-5 grid gap-4 md:grid-cols-[80px_1fr_auto] items-center"
                >
                  <div
                    className="hairline relative aspect-[2/3] w-20 overflow-hidden rounded-md border bg-bg-1"
                    aria-hidden
                  >
                    {tk.film?.cover_url && (
                      <img
                        src={tk.film.cover_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={`truncate text-cream-bright ${fa ? "font-vazir" : "font-display"} text-lg`}>
                      {title}
                    </div>
                    <div className="mt-1 text-xs text-cream/55 space-x-2 rtl:space-x-reverse">
                      <span className="inline-block rounded-full bg-cream/10 px-2 py-0.5 uppercase tracking-wider">
                        {statusLabel(tk.status, tk.expires_at)}
                      </span>
                      <span className="tabular-nums">
                        {tk.currency === "usd"
                          ? `$${(tk.amount / 100).toFixed(2)}`
                          : `${num(tk.amount)} ${tk.currency.toUpperCase()}`}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-cream/45">
                      {tk.paid_at && (
                        <>
                          {t.purchasedAt}{" "}
                          {new Date(tk.paid_at).toLocaleDateString(fa ? "fa-IR" : "en-US")}
                        </>
                      )}
                      {exp && (
                        <>
                          {" · "}
                          {t.expiresAt}{" "}
                          {exp.toLocaleString(fa ? "fa-IR" : "en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="md:justify-self-end">
                    {active && tk.film ? (
                      <Link
                        to="/watch/$slug"
                        params={{ slug: tk.film.slug }}
                        className="inline-flex items-center justify-center rounded-md bg-amber px-4 py-2 text-sm font-medium text-bg-0 hover:bg-amber/90"
                      >
                        {t.watch}
                      </Link>
                    ) : tk.film ? (
                      <Link
                        to="/films/$slug"
                        params={{ slug: tk.film.slug }}
                        className="inline-flex items-center justify-center rounded-md border border-cream/20 px-4 py-2 text-sm text-cream/80 hover:bg-cream/10"
                      >
                        {fa ? "جزئیات" : "Details"}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
