# Redesign the hero Watch button

## Scope
Only the primary CTA link in `src/components/featured-film.tsx` (lines ~388–405). Nothing else on the hero, no logic changes — the dynamic CTA label (`پخش` / `ورود و پخش` / `خرید اشتراک و پخش` / `Watch`) and the `Link` target stay identical.

## Current state
A flat amber pill: solid `bg-amber`, small ink-tinted square holding a play triangle, text label. Works, but reads as generic and slightly toy-like next to the cinematic hero frame.

## Target feel
Cinematic, premium, tactile — like a physical projector switch, not a web button. Amber stays the signature color; only the surface, depth, and micro-motion change.

## Direction options
Pick one to build.

**A. Gilded pill with sheen sweep**
- Gradient fill: `linear-gradient(135deg, amber → amber-bright → amber)` for a subtle gold shimmer.
- 1px inner highlight (top) + 1px inner shadow (bottom) via ring/inset shadow for a struck-metal edge.
- Play glyph sits in a circular (not squared) ink well with a soft inner shadow.
- Hover: a diagonal light sweep (`::before` translate + mask) crosses the pill once, ~700ms.
- Shadow: layered — soft ambient + tighter amber glow that intensifies on hover.

**B. Glass-on-amber (frosted premium)**
- Pill is `amber/90` with backdrop-blur and a fine amber ring; feels like colored glass over the poster.
- Play glyph in a translucent white circle with `mix-blend-overlay`.
- Hover: ring brightens, glyph circle fills to solid ink, whole pill lifts 2px with an amber halo.
- Focus ring stays the current amber offset ring.

**C. Split-face command key**
- Two-tone pill: left third is a darker ink "keycap" holding the play triangle, right two-thirds is amber holding the label — separated by a hairline divider.
- Suggests a physical play key on a control desk; matches the "Cinematic Depth Console" hero language.
- Hover: the amber face brightens and the ink face's triangle nudges 2px right; press state depresses 1px with a shorter shadow.

All three:
- Keep current sizing, focus ring, RTL behavior, and `active:scale-[0.97]`.
- Add `prefers-reduced-motion` guard around the sheen/nudge animation.
- Reuse existing `--amber` / ink tokens in `src/styles.css`; no hardcoded hex.

## Files touched
- `src/components/featured-film.tsx` — button markup + classes only.
- `src/styles.css` — add 1–2 utility classes or keyframes if the chosen direction needs the sheen sweep (A) or divider (C).

## Out of scope
Mobile "Watch" pill styling, secondary buttons, hero layout, CTA label logic.

---

Reply with **A**, **B**, or **C** (or a blend) and I'll implement it.
