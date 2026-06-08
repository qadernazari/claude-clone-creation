import { Link, useRouterState } from "@tanstack/react-router";

export type SectionTab = {
  to: string;
  label: string;
};

export function SectionTabs({
  section,
  tabs,
}: {
  section: string;
  tabs: ReadonlyArray<SectionTab>;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="px-8 pt-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {section}
        </div>
        <nav className="mt-2 -mb-px flex gap-1 overflow-x-auto">
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
