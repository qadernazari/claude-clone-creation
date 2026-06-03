import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { Logo } from "@/components/logo";
import { AuthMenu } from "@/components/auth-menu";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">{error.message}</p>
          <button onClick={() => { reset(); router.invalidate(); }} className="text-sm underline">
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

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  locale: string;
  created_at: string;
};

type Ticket = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  expires_at: string | null;
  film: { slug: string; title_en: string; title_fa: string | null } | null;
};

type Contribution = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  film: { slug: string; title_en: string; title_fa: string | null } | null;
};

function AccountPage() {
  const { locale, num, dir, setLocale } = useLocale();
  const fa = locale === "fa";
  const qc = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["account", "profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, locale, created_at")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Profile | null;
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["account", "tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, amount, currency, paid_at, expires_at, film:films(slug, title_en, title_fa)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as unknown as Ticket[]) ?? [];
    },
  });

  const { data: contributions = [] } = useQuery({
    queryKey: ["account", "contributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("id, amount, currency, status, paid_at, created_at, film:films(slug, title_en, title_fa)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as unknown as Contribution[]) ?? [];
    },
  });

  const [name, setName] = useState("");
  useEffect(() => { if (profile?.full_name) setName(profile.full_name); }, [profile?.full_name]);

  const saveProfile = useMutation({
    mutationFn: async (vars: { full_name: string; locale: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: vars.full_name, locale: vars.locale })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account", "profile"] }),
  });

  const now = Date.now();
  const paidTickets = tickets.filter((t) => t.status === "paid");
  const activeTickets = paidTickets.filter(
    (t) => t.expires_at && new Date(t.expires_at).getTime() > now,
  );
  const paidContributions = contributions.filter((c) => c.status === "paid");
  const totalContributedUsd = paidContributions
    .filter((c) => c.currency === "usd")
    .reduce((s, c) => s + c.amount, 0);

  const tr = {
    title: fa ? "حساب کاربری" : "Your account",
    sub: fa ? "اطلاعات شما، بلیط‌ها و حمایت‌ها" : "Profile, tickets & contributions",
    profile: fa ? "پروفایل" : "Profile",
    name: fa ? "نام" : "Full name",
    email: fa ? "ایمیل" : "Email",
    language: fa ? "زبان" : "Language",
    save: fa ? "ذخیره" : "Save changes",
    saved: fa ? "ذخیره شد" : "Saved",
    overview: fa ? "خلاصه" : "Overview",
    activeTickets: fa ? "بلیط فعال" : "Active tickets",
    totalTickets: fa ? "بلیط خریداری‌شده" : "Tickets purchased",
    contributedLabel: fa ? "حمایت‌های شما" : "Contributed",
    ticketsTitle: fa ? "بلیط‌های من" : "My tickets",
    contribTitle: fa ? "حمایت‌های من" : "My contributions",
    viewAll: fa ? "مشاهده همه" : "View all",
    none: fa ? "هنوز موردی نیست" : "Nothing yet",
    browse: fa ? "مشاهده فیلم‌ها" : "Browse films",
    watch: fa ? "تماشا" : "Watch",
    details: fa ? "جزئیات" : "Details",
    member: fa ? "عضو از" : "Member since",
    signOut: fa ? "خروج از حساب" : "Sign out",
    danger: fa ? "حساب کاربری" : "Account",
  };

  function ftitle(f: { title_en: string; title_fa: string | null } | null) {
    if (!f) return "—";
    return fa ? f.title_fa || f.title_en : f.title_en;
  }

  function money(amount: number, currency: string) {
    if (currency === "usd") return `$${(amount / 100).toFixed(2)}`;
    return `${num(amount)} ${currency.toUpperCase()}`;
  }

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

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-12">
        <div>
          <h1 className={`text-3xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {tr.title}
          </h1>
          <p className="mt-1 text-sm text-cream/60">{tr.sub}</p>
        </div>

        {/* Overview cards */}
        <section className="grid gap-px overflow-hidden rounded-2xl bg-line md:grid-cols-3">
          {[
            { label: tr.activeTickets, value: num(activeTickets.length) },
            { label: tr.totalTickets, value: num(paidTickets.length) },
            {
              label: tr.contributedLabel,
              value: totalContributedUsd > 0
                ? `$${(totalContributedUsd / 100).toFixed(2)}`
                : "—",
            },
          ].map((s, i) => (
            <div key={i} className="bg-bg-0 p-6">
              <div className="text-[11px] uppercase tracking-widest text-cream/55">{s.label}</div>
              <div className={`mt-2 text-3xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                {s.value}
              </div>
            </div>
          ))}
        </section>

        {/* Profile form */}
        <section className="hairline rounded-2xl border bg-bg-1/40 p-6 md:p-8">
          <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {tr.profile}
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cream/55">{tr.name}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
                placeholder={fa ? "نام شما" : "Your name"}
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cream/55">{tr.email}</span>
              <input
                type="email"
                value={profile?.email ?? user?.email ?? ""}
                disabled
                className="mt-2 w-full rounded-md border border-cream/10 bg-bg-0/60 px-3 py-2 text-cream/60"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cream/55">{tr.language}</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as "en" | "fa")}
                className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
              >
                <option value="en">English</option>
                <option value="fa">فارسی</option>
              </select>
            </label>
            <div className="block">
              <span className="text-xs uppercase tracking-widest text-cream/55">{tr.member}</span>
              <div className="mt-2 px-3 py-2 text-sm text-cream/70">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString(fa ? "fa-IR" : "en-US", {
                      year: "numeric", month: "long",
                    })
                  : "—"}
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              disabled={saveProfile.isPending}
              onClick={() => saveProfile.mutate({ full_name: name, locale })}
              className="rounded-full bg-cream px-5 py-2 text-sm font-medium text-ink hover:bg-cream-bright disabled:opacity-60"
            >
              {saveProfile.isPending ? "…" : tr.save}
            </button>
            {saveProfile.isSuccess && (
              <span className="text-xs text-amber">{tr.saved}</span>
            )}
          </div>
        </section>

        {/* Tickets */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {tr.ticketsTitle}
            </h2>
            {tickets.length > 0 && (
              <Link to="/my-tickets" className="text-xs uppercase tracking-widest text-cream/60 hover:text-cream">
                {tr.viewAll}
              </Link>
            )}
          </div>
          {tickets.length === 0 ? (
            <div className="hairline rounded-xl border bg-bg-1/40 p-8 text-center">
              <p className="text-cream/70 text-sm">{tr.none}</p>
              <Link
                to="/"
                className="mt-4 inline-block rounded-full bg-amber px-4 py-2 text-sm font-medium text-bg-0 hover:bg-amber/90"
              >
                {tr.browse}
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {tickets.slice(0, 5).map((tk) => {
                const exp = tk.expires_at ? new Date(tk.expires_at) : null;
                const active = tk.status === "paid" && exp && exp.getTime() > now;
                return (
                  <li
                    key={tk.id}
                    className="hairline rounded-xl border bg-bg-1/40 px-4 py-3 flex items-center gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                        {ftitle(tk.film)}
                      </div>
                      <div className="text-[11px] text-cream/55 tabular-nums">
                        {money(tk.amount, tk.currency)}
                        {exp ? (
                          <> {" · "} {active ? (fa ? "تا " : "until ") : (fa ? "منقضی " : "expired ")}
                            {exp.toLocaleDateString(fa ? "fa-IR" : "en-US", { dateStyle: "medium" })}
                          </>
                        ) : null}
                      </div>
                    </div>
                    {active && tk.film ? (
                      <Link
                        to="/watch/$slug"
                        params={{ slug: tk.film.slug }}
                        className="rounded-md bg-amber px-3 py-1.5 text-xs font-medium text-bg-0 hover:bg-amber/90"
                      >
                        {tr.watch}
                      </Link>
                    ) : tk.film ? (
                      <Link
                        to="/films/$slug"
                        params={{ slug: tk.film.slug }}
                        className="rounded-md border border-cream/20 px-3 py-1.5 text-xs text-cream/80 hover:bg-cream/10"
                      >
                        {tr.details}
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Contributions */}
        <section>
          <h2 className={`mb-4 text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {tr.contribTitle}
          </h2>
          {paidContributions.length === 0 ? (
            <div className="hairline rounded-xl border bg-bg-1/40 p-8 text-center">
              <p className="text-cream/70 text-sm">{tr.none}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {paidContributions.slice(0, 10).map((c) => (
                <li
                  key={c.id}
                  className="hairline rounded-xl border bg-bg-1/40 px-4 py-3 flex items-center gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                      {c.film ? ftitle(c.film) : (fa ? "حمایت عمومی" : "General support")}
                    </div>
                    <div className="text-[11px] text-cream/55">
                      {c.paid_at
                        ? new Date(c.paid_at).toLocaleDateString(fa ? "fa-IR" : "en-US", { dateStyle: "medium" })
                        : null}
                    </div>
                  </div>
                  <div className="text-sm tabular-nums text-cream">{money(c.amount, c.currency)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sign out */}
        <section className="hairline rounded-2xl border bg-bg-1/40 p-6 md:p-8 flex items-center justify-between">
          <div>
            <div className={`text-cream-bright ${fa ? "font-vazir" : "font-display"} text-lg`}>{tr.danger}</div>
            <p className="mt-1 text-xs text-cream/55">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-cream/20 px-4 py-2 text-sm text-cream/90 hover:bg-cream/10"
          >
            {tr.signOut}
          </button>
        </section>
      </main>
    </div>
  );
}
