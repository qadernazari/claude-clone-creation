import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy URL — purchases live inside the unified Library page now. Keep
 * the route so old links and bookmarks resolve to the right tab.
 */
export const Route = createFileRoute("/_authenticated/my-tickets")({
  beforeLoad: () => {
    throw redirect({ to: "/library", search: { tab: "purchased" } });
  },
  component: () => null,
});

