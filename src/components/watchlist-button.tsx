import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toggleWatchlist, getWatchlistStatus } from "@/lib/library.functions";
import { useCurrentUser } from "@/hooks/use-subscription";
import { useLocale } from "@/lib/i18n";

type Props = {
  filmId: string;
  variant?: "pill" | "icon";
  className?: string;
};

export function WatchlistButton({ filmId, variant = "pill", className = "" }: Props) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const user = useCurrentUser();

  if (!user) return null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getWatchlistStatus);
  const toggle = useServerFn(toggleWatchlist);
  const [inList, setInList] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) {
      setInList(null);
      return;
    }
    fetchStatus({ data: { filmId } })
      .then((r) => setInList(r.inWatchlist))
      .catch(() => setInList(false));
  }, [user, filmId, fetchStatus]);

  const onClick = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setPending(true);
    const previous = inList ?? false;
    const next = !previous;
    // Optimistic update
    setInList(next);
    try {
      const r = await toggle({ data: { filmId, add: next } });
      setInList(r.inWatchlist);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      toast.success(
        r.inWatchlist
          ? fa ? "به فهرست تماشا اضافه شد" : "Added to your watchlist"
          : fa ? "از فهرست حذف شد" : "Removed from your watchlist",
      );
    } catch (err) {
      // Revert on failure
      setInList(previous);
      toast.error(
        err instanceof Error
          ? err.message
          : fa ? "خطا در به‌روزرسانی فهرست" : "Couldn't update your watchlist",
      );
    } finally {
      setPending(false);
    }
  };

  const added = inList === true;
  const label = added
    ? fa ? "در فهرست شما" : "In your watchlist"
    : fa ? "افزودن به فهرست" : "Add to watchlist";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={label}
        title={label}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/20 bg-bg-0/60 text-cream/85 backdrop-blur hover:border-cream/40 hover:text-cream-bright transition-colors disabled:opacity-50 ${className}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={added ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4.5L4 21V4a1 1 0 0 1 1-1z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/[4%] px-4 py-2 text-sm text-cream/85 hover:border-cream/40 hover:text-cream-bright transition-colors disabled:opacity-50 ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={added ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4.5L4 21V4a1 1 0 0 1 1-1z" />
      </svg>
      {added ? (fa ? "ذخیره شد" : "Saved") : (fa ? "افزودن به فهرست" : "Add to watchlist")}
    </button>
  );
}
