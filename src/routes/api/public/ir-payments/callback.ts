import { createFileRoute } from "@tanstack/react-router";

// ---------------------------------------------------------------------------
// Iranian gateway return callback — stub
// ---------------------------------------------------------------------------
// Iranian payment gateways (ZarinPal, IDPay, NextPay) redirect the user
// back here after payment with a status + reference in the query string.
// This handler will:
//   1. Verify the reference with the gateway (server-to-server)
//   2. On success, mark the corresponding tickets/subscriptions/contributions
//      row as paid using supabaseAdmin
//   3. Redirect the user to a success/failure page on the site
//
// Until a gateway is wired, this just renders a friendly placeholder so
// admins can confirm the route is reachable from the mirror domain.

export const Route = createFileRoute("/api/public/ir-payments/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("Status") ?? url.searchParams.get("status");
        const authority =
          url.searchParams.get("Authority") ??
          url.searchParams.get("trackId") ??
          url.searchParams.get("order_id");

        // TODO: verify `authority` with the active gateway, then update DB.
        // For now, just bounce the user back to /account with the raw result.
        const target = new URL("/account", url.origin);
        if (status) target.searchParams.set("ir_payment", status);
        if (authority) target.searchParams.set("ref", authority);

        return Response.redirect(target.toString(), 302);
      },
      POST: async ({ request }) => {
        // Some gateways POST the webhook server-to-server. Verify signature
        // here before processing.
        void request;
        return new Response("ok", { status: 200 });
      },
    },
  },
});
