import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MembershipPanel } from "@/components/membership-panel";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    console.error("account error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
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
  max_age_rating: string | null;
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
  const { locale, num, dir, region, setRegion } = useLocale();
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
        .select("id, email, full_name, locale, created_at, parental_pin, max_age_rating")
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

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwInfo, setPwInfo] = useState<string | null>(null);

  const changePassword = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      setPwError(null);
      setPwInfo(fa ? "رمز عبور به‌روزرسانی شد" : "Password updated");
    },
    onError: (e: Error) => {
      setPwInfo(null);
      setPwError(e.message);
    },
  });

  const sendReset = useMutation({
    mutationFn: async () => {
      const email = profile?.email ?? user?.email;
      if (!email) throw new Error("No email on file");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setPwError(null);
      setPwInfo(fa ? "ایمیل بازنشانی ارسال شد. صندوق ورودی خود را بررسی کنید." : "Reset email sent. Check your inbox.");
    },
    onError: (e: Error) => {
      setPwInfo(null);
      setPwError(e.message);
    },
  });

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
    regionLabel: fa ? "منطقه" : "Region",
    regionHint: fa ? "زبان، ارز و روش پرداخت را تعیین می‌کند" : "Sets language, currency, and payment method",
    insideIran: fa ? "داخل ایران" : "Inside Iran",
    outsideIran: fa ? "خارج از ایران" : "Outside Iran",
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
    password: fa ? "رمز عبور" : "Password",
    passwordHint: fa ? "رمز عبور جدید را وارد کنید (حداقل ۸ کاراکتر)." : "Set a new password (minimum 8 characters).",
    newPw: fa ? "رمز عبور جدید" : "New password",
    confirmPw: fa ? "تکرار رمز عبور" : "Confirm password",
    update: fa ? "به‌روزرسانی رمز" : "Update password",
    forgot: fa ? "رمز خود را فراموش کرده‌اید؟ ارسال ایمیل بازنشانی" : "Forgot your password? Send reset email",
    mismatch: fa ? "رمزها مطابقت ندارند" : "Passwords do not match",
    tooShort: fa ? "حداقل ۸ کاراکتر" : "Minimum 8 characters",
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
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-5 pt-20 pb-12 space-y-10 md:px-6 md:pt-32 md:space-y-12">
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
            <label className="block md:col-span-2">
              <span className="text-xs uppercase tracking-widest text-cream/55">{tr.regionLabel}</span>
              <div className="mt-2 inline-flex w-full max-w-md items-center gap-1 rounded-full border border-cream/10 bg-bg-0 p-1">
                {([
                  { key: "iran" as const, label: tr.insideIran },
                  { key: "global" as const, label: tr.outsideIran },
                ]).map((opt) => {
                  const active = region === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRegion(opt.key)}
                      aria-pressed={active}
                      className={`flex-1 rounded-full px-4 py-2 text-sm transition-all duration-300 ${
                        active ? "bg-cream text-ink" : "text-cream/65 hover:text-cream"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-cream/45">{tr.regionHint}</p>
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

        {/* Membership */}
        <MembershipPanel />

        {/* Parental controls */}
        <ParentalControlsPanel profile={profile ?? null} />


        {/* Password */}
        <section className="hairline rounded-2xl border bg-bg-1/40 p-6 md:p-8">
          <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {tr.password}
          </h2>
          <p className="mt-1 text-xs text-cream/55">{tr.passwordHint}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPwError(null);
              setPwInfo(null);
              if (newPassword.length < 8) { setPwError(tr.tooShort); return; }
              if (newPassword !== confirmPassword) { setPwError(tr.mismatch); return; }
              changePassword.mutate(newPassword);
            }}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cream/55">{tr.newPw}</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-cream/55">{tr.confirmPw}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={changePassword.isPending || !newPassword}
                className="rounded-full bg-cream px-5 py-2 text-sm font-medium text-ink hover:bg-cream-bright disabled:opacity-60"
              >
                {changePassword.isPending ? "…" : tr.update}
              </button>
              <button
                type="button"
                onClick={() => sendReset.mutate()}
                disabled={sendReset.isPending}
                className="text-xs text-cream/70 underline-offset-4 hover:text-cream hover:underline disabled:opacity-60"
              >
                {tr.forgot}
              </button>
              {pwInfo && <span className="text-xs text-amber">{pwInfo}</span>}
              {pwError && <span className="text-xs text-destructive">{pwError}</span>}
            </div>
          </form>
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
      <SiteFooter />
    </div>
  );
}

const AGE_RATINGS = ["G", "PG", "PG-13", "R", "NC-17", "TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA"] as const;

type ProfileLite = {
  parental_pin: string | null;
  max_age_rating: string | null;
} | null;

function ParentalControlsPanel({ profile }: { profile: ProfileLite }) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const qc = useQueryClient();
  const [pin, setPin] = useState<string>(profile?.parental_pin ?? "");
  const [maxAge, setMaxAge] = useState<string>(profile?.max_age_rating ?? "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setPin(profile?.parental_pin ?? "");
    setMaxAge(profile?.max_age_rating ?? "");
  }, [profile?.parental_pin, profile?.max_age_rating]);

  const save = useMutation({
    mutationFn: async () => {
      setErr(null);
      const trimmed = pin.trim();
      if (trimmed && !/^[0-9]{4,6}$/.test(trimmed)) {
        throw new Error(fa ? "پین باید ۴ تا ۶ رقم باشد" : "PIN must be 4–6 digits");
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          parental_pin: trimmed || null,
          max_age_rating: maxAge || null,
        })
        .eq("id", (await supabase.auth.getUser()).data.user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account", "profile"] }),
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <section className="hairline rounded-2xl border bg-bg-1/40 p-6 md:p-8">
      <h2 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
        {fa ? "کنترل والدین" : "Parental Controls"}
      </h2>
      <p className="mt-1 text-xs text-cream/55">
        {fa
          ? "محتوای بزرگ‌سال را مخفی کنید و با پین قفل کنید."
          : "Hide mature content and lock it behind a PIN."}
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-cream/55">
            {fa ? "بیشترین رده سنی مجاز" : "Max age rating"}
          </span>
          <select
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
          >
            <option value="">{fa ? "بدون محدودیت" : "No limit"}</option>
            {AGE_RATINGS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <span className="mt-2 block text-[11px] text-cream/45">
            {fa
              ? "فیلم‌های بالاتر از این رده در فهرست مخفی می‌شوند."
              : "Films above this rating are hidden from browse."}
          </span>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-cream/55">
            {fa ? "پین والدین (۴ تا ۶ رقم)" : "Parental PIN (4–6 digits)"}
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder={fa ? "اختیاری" : "Optional"}
            className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
          />
          <span className="mt-2 block text-[11px] text-cream/45">
            {fa
              ? "برای دور زدن محدودیت رده سنی پرسیده می‌شود."
              : "Required to bypass the age rating limit."}
          </span>
        </label>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate()}
          className="rounded-full bg-amber px-5 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          {save.isPending ? "…" : fa ? "ذخیره" : "Save"}
        </button>
        {save.isSuccess && (
          <span className="text-xs text-amber">
            {fa ? "ذخیره شد" : "Saved"}
          </span>
        )}
        {err && <span className="text-xs text-rose-400">{err}</span>}
      </div>
    </section>
  );
}
