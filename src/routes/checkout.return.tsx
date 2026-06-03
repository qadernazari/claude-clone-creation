import { createFileRoute, Link } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string; film?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
    film: typeof search.film === "string" ? search.film : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id, film } = Route.useSearch();
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <header className="border-b border-cream/10">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Link to="/" aria-label="IRAN — home"><Logo size={36} /></Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        {session_id ? (
          <>
            <h1 className={`text-3xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
              {fa ? "بلیط شما فعال شد" : "Your ticket is active"}
            </h1>
            <p className="mt-4 text-cream/70">
              {fa
                ? "از حمایت شما متشکریم. اکنون می‌توانید فیلم را تماشا کنید."
                : "Thank you for your support. You can watch the film now."}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              {film ? (
                <Link
                  to="/films/$slug"
                  params={{ slug: film }}
                  className="rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-bg-0 hover:bg-amber/90"
                >
                  {fa ? "تماشای فیلم" : "Watch film"}
                </Link>
              ) : null}
              <Link
                to="/"
                className="rounded-md border border-cream/20 px-5 py-2.5 text-sm text-cream/90 hover:bg-cream/10"
              >
                {fa ? "بازگشت به خانه" : "Back to home"}
              </Link>
            </div>
          </>
        ) : (
          <p className="text-cream/70">{fa ? "اطلاعاتی پیدا نشد." : "No session information found."}</p>
        )}
      </main>
    </div>
  );
}
