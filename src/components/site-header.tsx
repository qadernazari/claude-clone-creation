import { useLocale } from "../lib/i18n";
import { Logo } from "./logo";
import { AuthMenu } from "./auth-menu";

function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="hairline inline-flex items-center gap-0.5 rounded-full border bg-bg-1/60 p-1 text-[10px] uppercase tracking-widest">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-2.5 py-1 font-bold transition-colors ${
          locale === "en" ? "bg-amber text-ink" : "text-cream/40 hover:text-cream"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("fa")}
        className={`rounded-full px-2.5 py-1 font-bold transition-colors ${
          locale === "fa" ? "bg-amber text-ink" : "text-cream/40 hover:text-cream"
        }`}
        aria-pressed={locale === "fa"}
      >
        فا
      </button>
    </div>
  );
}

export function SiteHeader({ current }: { current?: "home" | "browse" | "about" }) {
  const { locale } = useLocale();
  const linkCls = (key: "home" | "browse" | "about") =>
    `transition-colors ${current === key ? "text-cream" : "text-cream/60 hover:text-cream"}`;

  return (
    <header className="fixed top-0 z-30 w-full border-b border-line bg-bg-0/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-10">
          <a href="/" className="inline-flex items-center" aria-label="IRAN — home">
            <Logo size={36} />
          </a>
          <nav className="hidden gap-8 text-[11px] font-medium uppercase tracking-[0.2em] md:flex">
            <a href="/" className={linkCls("home")}>
              {locale === "fa" ? "خانه" : "Home"}
            </a>
            <a href="/browse" className={linkCls("browse")}>
              {locale === "fa" ? "آثار اختصاصی" : "Originals"}
            </a>
            <a href="/about" className={linkCls("about")}>
              {locale === "fa" ? "درباره" : "About"}
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}
