## Revert Watch button design, just make it bigger

You're right — you asked for a size fix, not a redesign. I'll revert the "Cinematic gilded pill" styling and go back to the previous simple amber Watch button, just sized up so it doesn't feel small.

### Changes

**1. `src/components/featured-film.tsx` (desktop Watch button, line 388–404)**
- Remove `btn-cinematic` class and the layered ink-well play icon wrapper.
- Restore the previous simple structure: solid amber background, play icon + label inline.
- Bump size: `px-6 py-3`, `text-base`, icon `w-4 h-4` (previously `px-5 py-2.5`, `text-sm`, icon 11×11).

Resulting className:
`inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber px-6 py-3 text-base font-bold text-ink shadow-lg shadow-amber/25 transition hover:bg-amber-bright hover:shadow-amber/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 active:scale-[0.98]`

**2. `src/styles.css`**
- Delete the now-unused `.btn-cinematic` block (rules at lines 257–309, including `::before` sheen keyframes) so no dead CSS ships.

### Not touching
- Mobile Watch pill (line 337–345) — unchanged, it wasn't part of the redesign complaint.
- Any other layout, spacing, or copy.
