import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Brand-aligned empty state used across library, watchlist, search results,
 * admin lists. Editorial copy + amber line-art glyph + optional CTA.
 */
export function EmptyState({
  eyebrow,
  title,
  description,
  icon,
  cta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <div
        className="mb-6 flex items-center justify-center rounded-full text-amber"
        style={{
          width: "64px",
          height: "64px",
          border: "1px solid rgba(var(--rgb-amber), 0.30)",
          background: "rgba(var(--rgb-amber), 0.06)",
        }}
        aria-hidden
      >
        {icon ?? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M8 6V4m8 2V4M3 10h18" />
          </svg>
        )}
      </div>
      {eyebrow && (
        <span
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em]"
          style={{ color: "rgba(var(--rgb-amber), 0.9)" }}
        >
          {eyebrow}
        </span>
      )}
      <h3 className="font-display text-xl font-medium tracking-[-0.01em] text-cream-bright md:text-2xl">
        {title}
      </h3>
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-cream/55">{description}</p>
      )}
      {cta && (
        <Link
          to={cta.to as any}
          className="mt-7 inline-flex min-h-11 items-center rounded-md bg-amber px-6 py-3 text-[13px] font-semibold text-bg-0 transition-all duration-300 hover:bg-amber/90 hover:scale-[1.02] hover:shadow-[0_10px_40px_-12px_rgba(201,168,76,0.4)] active:scale-[0.98]"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
