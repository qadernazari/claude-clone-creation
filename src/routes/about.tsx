import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "../lib/i18n";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";


export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — IRAN" },
      {
        name: "description",
        content:
          "IRAN is a streaming home for Iranian short cinema. Membership with a 7-day free trial, plus Premium rentals. Fair pay for filmmakers.",
      },
      { property: "og:title", content: "About — IRAN" },
      {
        property: "og:description",
        content:
          "Iranian short films, streaming worldwide. Membership with a free trial, plus Premium rentals. Fair pay for filmmakers.",
      },
      { property: "og:url", content: "https://ir.show/about" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/about" }],
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
      <SiteHeader current="about" />


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
              : "Iranian short films, streaming worldwide."}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/70">
            {fa
              ? "ایران یک پلتفرم پخش بلیتی، دو زبانه و بدون اشتراک است. شما هزینه‌ی همان فیلمی را می‌پردازید که می‌خواهید ببینید — و بخش بزرگی از آن مستقیم به فیلم‌ساز می‌رسد."
              : "A streaming home for Iranian short cinema. Membership with a 7-day free trial, plus Premium rentals for select releases. Fair, transparent pay for the people who made the film."}
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
                : "Iranian short cinema deserves a home where its authentic voice is heard — without algorithms, without ad pre-rolls, and without unfair middlemen between filmmakers and the audience."}
            </p>
            <p>
              {fa
                ? "هر فیلم با وسواس انتخاب می‌شود. هر بلیت یک حمایت مستقیم است. هر تماشاگر، بخشی از یک جامعه‌ی کوچک اما واقعی‌ست."
                : "Every film is hand-picked. Every membership and ticket supports the artist directly. Every viewer is part of a small but real community."}
            </p>
          </div>

          <blockquote className="relative mt-14 max-w-3xl border-s-2 border-amber/60 ps-6">
            <p className="font-editorial text-2xl italic leading-snug text-cream-bright md:text-3xl">
              {fa
                ? "«سینما، آن‌گاه که اجازه می‌یابی صدای خودش باشد، چیزی برای پنهان کردن ندارد.»"
                : "“Cinema, when it is allowed to be its own voice, has nothing to hide.”"}
            </p>
            <footer className="mt-3 text-xs uppercase tracking-[0.25em] text-cream/45">
              {fa ? "— از مانیفست ما" : "— From our manifesto"}
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Principles — three commitments */}
      <section className="hairline border-t">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-amber">
            {fa ? "اصول ما" : "Principles"}
          </p>
          <h2 className="mb-12 max-w-2xl font-display text-3xl text-cream-bright md:text-4xl">
            {fa ? "سه تعهدی که نمی‌شکنیم." : "Three commitments we don't break."}
          </h2>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-line md:grid-cols-3">
            {[
              {
                en: ["Fair to filmmakers", "Filmmakers receive transparent revenue from every ticket and every membership stream, plus 100% of viewer tips. No hidden cuts."],
                fa: ["عدالت با فیلم‌ساز", "بخش عمده‌ی هر بلیت به‌طور مستقیم به هنرمند می‌رسد. پرداخت شفاف، بدون کسر پنهان."],
              },
              {
                en: ["Curated, never crowded", "We add films when they earn their place — not to fill a feed. Quality over quantity, always."],
                fa: ["انتخاب‌شده، نه شلوغ", "فیلم را وقتی اضافه می‌کنیم که جایگاهش را به دست آورده باشد — نه برای پر کردن صفحه."],
              },
              {
                en: ["Bilingual by design", "Persian and English at parity — both languages are first-class on every screen, every film."],
                fa: ["دوزبانه از پایه", "فارسی و انگلیسی هم‌شأن — هر دو زبان روی هر صفحه و هر فیلم در رتبه‌ی اول."],
              },
            ].map((p, i) => {
              const [title, desc] = fa ? p.fa : p.en;
              return (
                <div key={i} className="bg-bg-0 p-8">
                  <div className="mb-5 flex items-baseline gap-3">
                    <span className="font-display text-3xl font-extrabold text-amber/40 tabular-nums">
                      0{i + 1}
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <h3 className="mb-3 font-display text-xl text-cream-bright">{title}</h3>
                  <p className="text-sm leading-relaxed text-cream/60">{desc}</p>
                </div>
              );
            })}
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
                  href="mailto:info@ir.show"
                  className="mt-1 block text-lg text-cream-bright hover:text-amber"
                >
                  info@ir.show
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-cream/50">
                  {fa ? "فیلم‌سازان" : "Filmmakers"}
                </p>
                <a
                  href="mailto:info@ir.show"
                  className="mt-1 block text-lg text-cream-bright hover:text-amber"
                >
                  info@ir.show
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  );
}
