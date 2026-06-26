import { useState } from "react";
import { Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";

const emailSchema = z.string().trim().toLowerCase().email().max(255);

type Status = "idle" | "submitting" | "success" | "duplicate" | "error";

export function NewsletterSection() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const t = {
    label: fa ? "در جریان بمانید" : "Stay in the loop",
    heading: fa ? "فیلم‌های جدید، هر ماه." : "New films, added monthly.",
    subtitle: fa
      ? "وقتی فیلم‌های ایرانی جدید به پلتفرم اضافه می‌شوند، به شما خبر می‌دهیم."
      : "Get notified when new Iranian films arrive on the platform.",
    placeholder: fa ? "آدرس ایمیل شما" : "Your email address",
    button: fa ? "خبرم کنید" : "Notify Me",
    submitting: fa ? "در حال ارسال…" : "Submitting…",
    success: fa
      ? "ثبت شدید. وقتی فیلم جدید اضافه شود خبرتان می‌کنیم."
      : "You're on the list. We'll be in touch.",
    duplicate: fa ? "ایمیل شما قبلاً ثبت شده است." : "You're already on the list.",
    invalid: fa ? "لطفاً یک ایمیل معتبر وارد کنید." : "Please enter a valid email.",
    error: fa ? "خطایی رخ داد. دوباره تلاش کنید." : "Something went wrong. Please try again.",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setErrorMsg(t.invalid);
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: parsed.data, locale: fa ? "fa" : "en" });

    if (error) {
      // Unique violation
      if (error.code === "23505") {
        setStatus("duplicate");
        return;
      }
      setStatus("error");
      setErrorMsg(t.error);
      return;
    }

    setStatus("success");
  };

  const done = status === "success" || status === "duplicate";

  return (
    <section
      dir={fa ? "rtl" : "ltr"}
      className="relative overflow-hidden border-t border-line px-6 py-20 md:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <span
          className={`block text-[10px] font-semibold uppercase tracking-[0.40em] text-amber/90 ${fa ? "font-vazir" : ""}`}
        >
          {t.label}
        </span>
        <h2
          className={`mt-5 font-display text-2xl font-medium leading-tight tracking-[-0.02em] text-cream-bright md:text-3xl ${fa ? "font-vazir" : ""}`}
        >
          {t.heading}
        </h2>
        <p
          className={`mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-cream/60 ${fa ? "font-vazir" : ""}`}
        >
          {t.subtitle}
        </p>

        <div className="mt-9">
          {done ? (
            <div
              className={`mx-auto inline-flex items-center gap-2 rounded-md border border-amber/30 bg-amber/5 px-5 py-3 text-[14px] text-cream ${fa ? "font-vazir" : ""}`}
              role="status"
              aria-live="polite"
            >
              <Check className="h-4 w-4 text-amber" aria-hidden />
              <span>{status === "success" ? t.success : t.duplicate}</span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
              noValidate
            >
              <label htmlFor="newsletter-email" className="sr-only">
                {t.placeholder}
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder={t.placeholder}
                disabled={status === "submitting"}
                className={`h-11 flex-1 rounded-md border border-cream/20 bg-bg-0 px-4 text-[14px] text-cream placeholder:text-cream/35 transition-colors focus:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber/40 disabled:opacity-60 ${fa ? "font-vazir text-right" : ""}`}
                dir={fa ? "rtl" : "ltr"}
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className={`inline-flex h-11 items-center justify-center rounded-md bg-amber px-6 text-[13px] font-bold text-ink transition-all duration-200 hover:bg-amber-bright active:scale-[0.98] disabled:opacity-60 ${fa ? "font-vazir" : ""}`}
              >
                {status === "submitting" ? t.submitting : t.button}
              </button>
            </form>
          )}

          {status === "error" && errorMsg ? (
            <p
              className={`mt-3 text-[13px] text-red-400/90 ${fa ? "font-vazir" : ""}`}
              role="alert"
            >
              {errorMsg}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
