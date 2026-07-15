import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import {
  filmReviewsQueryOptions,
  submitFilmReview,
  deleteMyFilmReview,
  type FilmReview,
} from "@/lib/reviews.functions";

function Star({ filled, half = false }: { filled: boolean; half?: boolean }) {
  if (half) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <defs>
          <linearGradient id="half">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
          fill="url(#half)"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function StarRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="inline-flex items-center text-cream/90">
      {Array.from({ length: max }).map((_, i) => {
        const pos = i + 1;
        const filled = value >= pos;
        const half = !filled && value >= pos - 0.5;
        return <Star key={i} filled={filled} half={half} />;
      })}
    </div>
  );
}

function StarInput({
  value,
  onChange,
  disabled,
  fa,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  fa?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="p-1 text-cream-bright transition-transform hover:scale-110 disabled:opacity-50"
          aria-label={fa ? `${n} ستاره` : `${n} star${n === 1 ? "" : "s"}`}
        >
          <Star filled={display >= n} />
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function FilmReviewsSection({ filmId }: { filmId: string }) {
  const { locale, num, digits } = useLocale();
  const fa = locale === "fa";
  const qc = useQueryClient();
  const { data } = useQuery(filmReviewsQueryOptions(filmId));
  const submitFn = useServerFn(submitFilmReview);
  const deleteFn = useServerFn(deleteMyFilmReview);

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const myReview: FilmReview | undefined = data?.reviews.find(
    (r) => r.user_id === userId,
  );

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (myReview && !editing) {
      setRating(myReview.rating);
      setBody(myReview.body ?? "");
    }
    if (!myReview) {
      setRating(0);
      setBody("");
    }
  }, [myReview, editing]);

  const submit = useMutation({
    mutationFn: () => submitFn({ data: { filmId, rating, body: body.trim() || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["film-reviews", filmId] });
      setEditing(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { filmId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["film-reviews", filmId] });
      setRating(0);
      setBody("");
      setEditing(false);
    },
  });

  const agg = data?.aggregate;
  const reviews = data?.reviews ?? [];
  const otherReviews = reviews.filter((r) => r.user_id !== userId);

  return (
    <section
      id="reviews"
      className="mx-auto mt-12 max-w-4xl border-t border-cream/10 px-5 py-12 sm:px-6 md:mt-20 md:py-20"
    >
      <header className="mb-8 md:mb-12">
        <span className="block text-[10px] font-medium uppercase tracking-[0.28em] text-cream/70">
          {fa ? "نقد و نظر" : "Ratings & Reviews"}
        </span>
        <div className="mt-3 flex flex-wrap items-end gap-4 md:gap-6">
          <h2 className="font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-cream-bright md:text-5xl">
            {agg && agg.review_count > 0
              ? digits(agg.avg_rating.toFixed(1))
              : fa
                ? "هنوز نقدی نیست"
                : "No reviews yet"}
          </h2>
          {agg && agg.review_count > 0 && (
            <div className="mb-1 flex items-center gap-3">
              <StarRow value={agg.avg_rating} />
              <span className="text-sm text-cream/55">
                {num(agg.review_count)}{" "}
                {fa
                  ? "نقد"
                  : agg.review_count === 1
                    ? "review"
                    : "reviews"}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Write / edit form */}
      {userId ? (
        <div className="mb-10 rounded-2xl border border-cream/10 bg-bg-1/60 p-5 md:p-6">
          <h3 className="mb-3 text-sm font-medium text-cream-bright">
            {myReview && !editing
              ? fa
                ? "نقد شما"
                : "Your review"
              : myReview
                ? fa
                  ? "ویرایش نقد"
                  : "Edit your review"
                : fa
                  ? "نقد بنویسید"
                  : "Write a review"}
          </h3>

          {myReview && !editing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <StarRow value={myReview.rating} />
                <span className="text-xs text-cream/70">
                  {formatDate(myReview.created_at, locale)}
                </span>
              </div>
              {myReview.body && (
                <p className="text-sm leading-relaxed text-cream/80">
                  {myReview.body}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-md border border-cream/20 px-4 py-1.5 text-xs font-medium text-cream/80 hover:border-cream/40 hover:text-cream"
                >
                  {fa ? "ویرایش" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(fa ? "حذف نقد شما؟" : "Delete your review?")) {
                      remove.mutate();
                    }
                  }}
                  disabled={remove.isPending}
                  className="rounded-md border border-cream/10 px-4 py-1.5 text-xs font-medium text-cream/55 hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-50"
                >
                  {fa ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <StarInput
                  value={rating}
                  onChange={setRating}
                  disabled={submit.isPending}
                  fa={fa}
                />
                <span className="text-xs text-cream/70">
                  {rating > 0
                    ? `${num(rating)} / ${num(5)}`
                    : fa
                      ? "امتیاز را انتخاب کن"
                      : "Pick a rating"}
                </span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder={
                  fa
                    ? "نظرت چیست؟ (اختیاری)"
                    : "Share your thoughts (optional)"
                }
                className="w-full resize-none rounded-xl border border-cream/10 bg-bg-0/50 px-4 py-3 text-sm text-cream placeholder:text-cream/65 focus:border-cream/30 focus:outline-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-cream/65">
                  {num(body.length)} / {num(2000)}
                </span>
                <div className="flex gap-2">
                  {editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-md border border-cream/10 px-4 py-2 text-xs font-medium text-cream/55 hover:text-cream"
                    >
                      {fa ? "انصراف" : "Cancel"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={rating === 0 || submit.isPending}
                    onClick={() => submit.mutate()}
                    className="rounded-md bg-cream px-5 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submit.isPending
                      ? fa
                        ? "در حال ارسال…"
                        : "Submitting…"
                      : myReview
                        ? fa
                          ? "ذخیره"
                          : "Save"
                        : fa
                          ? "ارسال"
                          : "Submit"}
                  </button>
                </div>
              </div>
              {submit.error && (
                <p className="text-xs text-rose-400">
                  {(submit.error as Error).message}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-10 rounded-2xl border border-cream/10 bg-bg-1/40 p-5 text-center text-sm text-cream/55 md:p-6">
          <p>
            {fa
              ? "برای نوشتن نقد وارد شوید."
              : "Sign in to write a review."}
          </p>
        </div>
      )}

      {/* Reviews list */}
      {otherReviews.length === 0 && !myReview ? (
        <p className="text-sm text-cream/70">
          {fa
            ? "اولین نفری باش که این فیلم را نقد می‌کند."
            : "Be the first to review this film."}
        </p>
      ) : otherReviews.length === 0 ? null : (
        <ul className="space-y-6">
          {otherReviews.map((r) => (
            <li
              key={r.id}
              className="border-t border-cream/5 pt-6 first:border-t-0 first:pt-0"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cream/10 text-xs font-semibold text-cream/70">
                    {(r.author_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-cream-bright">
                      {r.author_name ??
                        (fa ? "کاربر ناشناس" : "Anonymous viewer")}
                    </span>
                    <span className="text-[11px] text-cream/70">
                      {formatDate(r.created_at, locale)}
                    </span>
                  </div>
                </div>
                <StarRow value={r.rating} />
              </div>
              {r.body && (
                <p className="mt-2 text-sm leading-relaxed text-cream/75">
                  {r.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
