import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type State =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "already" }
  | { status: "invalid" }
  | { status: "submitting" }
  | { status: "done" }
  | { status: "error"; message: string };

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe — ir.show" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid" });
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return setState({ status: "invalid" });
        if (data.valid) return setState({ status: "ready" });
        if (data.reason === "already_unsubscribed") return setState({ status: "already" });
        setState({ status: "invalid" });
      })
      .catch(() => setState({ status: "invalid" }));
  }, [token]);

  async function confirm() {
    setState({ status: "submitting" });
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await r.json().catch(() => ({}));
      if (data.success) return setState({ status: "done" });
      if (data.reason === "already_unsubscribed") return setState({ status: "already" });
      setState({ status: "error", message: data.error || "Something went wrong." });
    } catch {
      setState({ status: "error", message: "Network error" });
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <Link to="/" className="text-sm tracking-[0.3em] text-muted-foreground">
          IRAN
        </Link>

        {state.status === "loading" && (
          <p className="text-muted-foreground">Checking your link…</p>
        )}

        {state.status === "invalid" && (
          <>
            <h1 className="text-2xl font-semibold">Invalid or expired link</h1>
            <p className="text-muted-foreground">
              This unsubscribe link is no longer valid.
            </p>
          </>
        )}

        {state.status === "already" && (
          <>
            <h1 className="text-2xl font-semibold">You&apos;re already unsubscribed</h1>
            <p className="text-muted-foreground">
              You won&apos;t receive any more emails from us.
            </p>
          </>
        )}

        {state.status === "ready" && (
          <>
            <h1 className="text-2xl font-semibold">Unsubscribe from emails?</h1>
            <p className="text-muted-foreground">
              You will stop receiving receipts and notifications from IRAN.
            </p>
            <Button onClick={confirm} size="lg">Confirm unsubscribe</Button>
          </>
        )}

        {state.status === "submitting" && (
          <p className="text-muted-foreground">Processing…</p>
        )}

        {state.status === "done" && (
          <>
            <h1 className="text-2xl font-semibold">Unsubscribed</h1>
            <p className="text-muted-foreground">
              You won&apos;t receive any more emails from us.
            </p>
          </>
        )}

        {state.status === "error" && (
          <>
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground">{state.message}</p>
          </>
        )}

        <div>
          <Link to="/" className="text-sm underline text-muted-foreground">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
