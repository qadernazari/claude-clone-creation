import { Link, useRouterState } from "@tanstack/react-router";

export type SectionTab = {
  to: string;
  label: string;
};

export function SectionTabs({
  title,
  description,
  tabs,
}: {
  title: string;
  description?: string;
  tabs: ReadonlyArray<SectionTab>;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="border-b border-border bg-card/20">
      <div className="px-8 pt-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        <nav className="mt-5 -mb-px flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export const SITE_CONTENT_TABS: ReadonlyArray<SectionTab> = [
  { to: "/admin/homepage", label: "Homepage" },
  { to: "/admin/pages", label: "Pages" },
  { to: "/admin/faq", label: "FAQ" },
  { to: "/admin/menu", label: "Menu" },
  { to: "/admin/footer", label: "Footer" },
  { to: "/admin/banner", label: "Banner" },
  { to: "/admin/appearance", label: "Appearance" },
];

export const COMMERCE_TABS: ReadonlyArray<SectionTab> = [
  { to: "/admin/tickets", label: "Tickets" },
  { to: "/admin/trials", label: "Trials" },
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/admin/contributions", label: "Contributions" },
];
