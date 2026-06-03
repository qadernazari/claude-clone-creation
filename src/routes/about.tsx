import { createFileRoute, Link } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { Logo } from "../components/logo";
import { AuthMenu } from "../components/auth-menu";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About IRAN — A home for original Iranian short films" },
      {
        name: "description",
        content:
          "Our mission, the team behind IRAN, and how to reach us. A premium, ticket-based home for original Persian short films.",
      },
      { property: "og:title", content: "About IRAN" },
      {
        property: "og:description",
        content:
          "Our mission, the team, and how to reach us — a premium home for original Iranian short films.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { locale } = useLocale();
  const fa = locale === "fa";

  const team = [
    {
      en: { name: "Curatorial Collective", role: "Programming & selection" },
      fa: { name: "گروه برنامه‌ریزی", role: "گزینش و برنامه‌ریزی آثار" },
    },
    {
      en: { name: "Filmmaker Liaison", role: "Artist relations & payouts" },
      fa: { name: "رابط فیلم‌سازان", role: "ارتباط با هنرمندان و پرداخت‌ها" },
    },
    {
      en: { name: "Engineering & Design", role: "Product, streaming, payments" },
      fa: { name: "مهندسی و طراحی", role: "محصول، پخش و پرداخت" },
    },
  ];

  return (
    <div className="min-h-screen bg-bg-0 text-cream">
      <header className="hairline sticky top-0 z-30 border-b bg-bg-0/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center" aria-label="IRAN — home">
            <Logo size={44} />
          </Link>
          <nav className="hidden gap-8 text-sm text-cream/70 md:flex">
            <Link to="/" className="hover:text-cream">
              {fa ? "خانه" : "Home"}
            </Link>
            <Link to="/about" className="text-cream">
              {fa ? "درباره" : "About"}
            </Link>
          </nav>
          <AuthMenu />
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, oklch(0.35 0.06 60 / 0.55), transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.40 0.10 75 / 0.45), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-6 py-24 md:py-32">
          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
            {fa ? "درباره‌ی ایران" : "About IRAN"}
          </p>
          <h1 className="font-display text-5xl leading-[1.05] text-cream-bright md:text-6xl">
            {fa
              ? "خانه‌ای برای سینمای کوتاهِ ایران."
              : "A home for original Iranian short films."}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/70">
            {fa
              ? "ایران یک پلتفرم پخش بلیتی، دو زبانه و بدون اشتراک است. شما هزینه‌ی همان فیلمی را می‌پردازید که می‌خواهید ببینید — و بخش بزرگی از آن مستقیم به فیلم‌ساز می‌رسد."
              : "IRAN is a ticket-based, bilingual streaming home with no subscription. You pay only for the film you want to watch — and the lion's share goes directly to the filmmaker."}
          </p>
        </div>
      </section>

      <section className="hairline border-t">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="mb-6 font-display text-3xl text-cream-bright md:text-4xl">
            {fa ? "مأموریت ما" : "Our mission"}
          </h2>
          <div className="space-y-5 text-cream/75">
            <p>
              {fa
                ? "ما باور داریم سینمای کوتاهِ ایران شایسته‌ی خانه‌ای‌ست که در آن صدای حقیقی‌اش شنیده شود — بدون الگوریتم، بدون اشتراک، و بدون واسطه‌های ناعادلانه."
                : "We believe Iranian short cinema deserves a home where its authentic voice is heard — without algorithms, without subscriptions, and without unfair middlemen."}
            </p>
            <p>
              {fa
                ? "هر فیلم با وسواس انتخاب می‌شود. هر بلیت یک حمایت مستقیم است. هر تماشاگر، بخشی از یک جامعه‌ی کوچک اما واقعی‌ست."
                : "Every film is selected with care. Every ticket is a direct act of support. Every viewer is part of a small but real community."}
            </p>
          </div>
        </div>
      </section>

      <section className="hairline border-t">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="mb-12 font-display text-3xl text-cream-bright md:text-4xl">
            {fa ? "تیم" : "The team"}
          </h2>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-line md:grid-cols-3">
            {team.map((member, i) => {
              const m = fa ? member.fa : member.en;
              return (
                <div key={i} className="bg-bg-0 p-8">
                  <div className="mb-4 text-amber">●</div>
                  <h3 className="mb-2 font-display text-xl text-cream-bright">
                    {m.name}
                  </h3>
                  <p className="text-sm text-cream/65">{m.role}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="hairline border-t">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="mb-6 font-display text-3xl text-cream-bright md:text-4xl">
            {fa ? "تماس" : "Contact"}
          </h2>
          <p className="mb-6 text-cream/75">
            {fa
              ? "برای ارسال اثر، همکاری، یا هر سؤالی، با ما در تماس باشید."
              : "For submissions, partnerships, or any question — reach out."}
          </p>
          <div className="hairline rounded-2xl border bg-bg-1/40 p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-cream/50">
                  {fa ? "ایمیل عمومی" : "General"}
                </p>
                <a
                  href="mailto:hello@iran.film"
                  className="mt-1 block text-lg text-cream-bright hover:text-amber"
                >
                  hello@iran.film
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-cream/50">
                  {fa ? "فیلم‌سازان" : "Filmmakers"}
                </p>
                <a
                  href="mailto:submissions@iran.film"
                  className="mt-1 block text-lg text-cream-bright hover:text-amber"
                >
                  submissions@iran.film
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="hairline border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-12 text-xs text-cream/50 md:flex-row md:items-center">
          <Logo size={32} />
          <p>
            © {new Date().getFullYear()} IRAN ·{" "}
            {fa
              ? "خانه‌ای برای سینمای کوتاه ایران"
              : "A home for contemporary Iranian cinema"}
          </p>
        </div>
      </footer>
    </div>
  );
}
