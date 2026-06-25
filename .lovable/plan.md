## Problem

On `/my-tickets`, the page title "My tickets" and subtitle "All your purchases" render underneath the fixed `SiteHeader`, so they visually mix with HOME / ORIGINALS / region switcher / BECOME A MEMBER.

Cause: the `<main>` uses `px-6 py-12` with no top offset to clear the fixed header. Other pages (e.g. `account.tsx`) use `pt-20 md:pt-32`.

## Change

In `src/routes/_authenticated/my-tickets.tsx`, update the `<main>` wrapper:

- From: `mx-auto max-w-5xl px-6 py-12`
- To:   `mx-auto max-w-5xl px-5 pt-20 pb-12 md:px-6 md:pt-32`

This matches the Account page spacing so the heading clears the sticky header on both mobile and desktop. No other logic, styling, or copy changes.
