import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { Logo } from "@/components/logo";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — IRAN" },
      {
        name: "description",
        content:
          "Sign in to IRAN to watch original Iranian short films, save your library, and continue where you left off.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | { email: string }>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [justResent, setJustResent] = useState(false);

  function safeRedirect() {
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      window.location.replace(redirectTo);
    } else {
      navigate({ to: "/", replace: true });
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) safeRedirect();
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) safeRedirect();
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

  const t = useMemo(
    () => ({
      title: fa ? "ورود به ایران" : "Enter IRAN",
      sub: fa
        ? "ایمیل خود را وارد کنید تا لینک امن ورود برایتان ارسال شود."
        : "Enter your email and we'll send you a secure sign-in link.",
      email: fa ? "ایمیل" : "Email address",
      continueBtn: fa ? "ادامه" : "Continue",
      sending: fa ? "در حال ارسال…" : "Sending link…",
      back: fa ? "بازگشت" : "Back",
      terms: fa
        ? "با ادامه، شرایط استفاده و سیاست حریم خصوصی را می‌پذیرید."
        : "By continuing, you agree to our Terms and Privacy Policy.",
      successTitle: fa ? "ایمیل خود را بررسی کنید" : "Check your inbox",
      successBody: fa
        ? "لینک امن ورود را به این آدرس ارسال کردیم:"
        : "We've sent a secure sign-in link to:",
      autoUpdate: fa
        ? "این صفحه پس از تأیید به‌صورت خودکار به‌روز می‌شود."
        : "This window will update automatically once you're signed in.",
      openMail: fa ? "باز کردن برنامه ایمیل" : "Open email app",
      openGmail: fa ? "باز کردن Gmail" : "Open Gmail",
      resend: fa ? "ارسال مجدد ایمیل" : "Resend email",
      resendIn: (n: number) => (fa ? `ارسال مجدد در ${n} ثانیه` : `Resend in ${n}s`),
      resent: fa ? "ایمیل دوباره ارسال شد" : "Email resent",
      changeEmail: fa ? "تغییر ایمیل" : "Use a different email",
      waiting: fa ? "در انتظار تأیید…" : "Waiting for confirmation…",
      invalidEmail: fa ? "ایمیل معتبر وارد کنید." : "Please enter a valid email address.",
    }),
    [fa],
  );

  function humanizeError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("rate limit") || m.includes("too many")) {
      return fa
        ? "تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید."
        : "Too many attempts — please wait a moment and try again.";
    }
    return message;
  }

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function sendMagicLink(target: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    if (!validateEmail(email)) {
      setEmailError(t.invalidEmail);
      return;
    }
    setLoading(true);
    try {
      await sendMagicLink(email.trim());
      setSuccess({ email: email.trim() });
      setResendCooldown(30);
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!success || resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await sendMagicLink(success.email);
      setResendCooldown(30);
      setJustResent(true);
      window.setTimeout(() => setJustResent(false), 2500);
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err)));
    } finally {
      setResending(false);
    }
  }

  function backToForm() {
    setSuccess(null);
    setError(null);
  }

  const viewKey = success ? "success" : "form";

  return (
    <div
      dir={dir}
      className="relative min-h-[100svh] bg-bg-0 text-cream overflow-hidden flex flex-col"
    >
      {/* Subtle cinematic vignette — no color, just depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 md:px-8 md:pt-6">
        {success ? (
          <button
            type="button"
            onClick={backToForm}
            aria-label={t.back}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/10 text-cream/70 transition-colors hover:bg-cream/5 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
        ) : (
          <Link
            to="/"
            aria-label={t.back}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/10 text-cream/70 transition-colors hover:bg-cream/5 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
        )}
        <Link to="/" className="inline-flex items-center gap-2">
          <Logo size={32} />
        </Link>
        <div className="h-10 w-10" aria-hidden />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-[max(env(safe-area-inset-bottom),2rem)] md:px-8">
        <div key={viewKey} className="w-full max-w-[400px] mx-auto animate-fade-in">
          {success ? (
            <SuccessView
              email={success.email}
              fa={fa}
              t={t}
              resendCooldown={resendCooldown}
              resending={resending}
              justResent={justResent}
              onResend={handleResend}
              onChangeEmail={backToForm}
              error={error}
            />
          ) : (
            <>
              <div className="text-center">
                <h1
                  className={`text-[30px] leading-tight font-semibold tracking-tight md:text-[38px] ${
                    fa ? "font-fa" : "font-display"
                  }`}
                >
                  {t.title}
                </h1>
                <p className="mt-4 text-[14px] leading-relaxed text-cream/55 md:text-[15px] max-w-[340px] mx-auto">
                  {t.sub}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 space-y-4" noValidate>
                <fieldset disabled={loading} className="contents">
                  <FloatingInput
                    id="email"
                    type="email"
                    label={t.email}
                    value={email}
                    onChange={(v) => {
                      setEmail(v);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={() => {
                      if (email && !validateEmail(email)) setEmailError(t.invalidEmail);
                    }}
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="go"
                    required
                    error={emailError}
                  />
                </fieldset>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive-foreground animate-slide-down-in"
                  >
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/25 text-[10px] font-bold">
                      !
                    </span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-cream text-ink text-[14px] font-semibold tracking-wide transition-all hover:bg-cream-bright active:scale-[0.98] disabled:opacity-70"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{loading ? t.sending : t.continueBtn}</span>
                </button>
              </form>

              <p className="mt-8 text-center text-[11px] leading-relaxed text-cream/30 px-4">
                {t.terms}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- Success view ---------- */

function SuccessView({
  email,
  fa,
  t,
  resendCooldown,
  resending,
  justResent,
  onResend,
  onChangeEmail,
  error,
}: {
  email: string;
  fa: boolean;
  t: {
    successTitle: string;
    successBody: string;
    autoUpdate: string;
    openMail: string;
    openGmail: string;
    resend: string;
    resendIn: (n: number) => string;
    resent: string;
    changeEmail: string;
    waiting: string;
  };
  resendCooldown: number;
  resending: boolean;
  justResent: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
  error: string | null;
}) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const provider = useMemo(() => {
    if (/gmail\.com|googlemail\.com/.test(domain)) return "gmail" as const;
    if (/outlook\.|hotmail\.|live\.|msn\./.test(domain)) return "outlook" as const;
    if (/yahoo\./.test(domain)) return "yahoo" as const;
    if (/icloud\.com|me\.com|mac\.com/.test(domain)) return "icloud" as const;
    return null;
  }, [domain]);

  const providerUrl =
    provider === "gmail"
      ? "https://mail.google.com/mail/u/0/#inbox"
      : provider === "outlook"
        ? "https://outlook.live.com/mail/0/inbox"
        : provider === "yahoo"
          ? "https://mail.yahoo.com/"
          : provider === "icloud"
            ? "https://www.icloud.com/mail"
            : null;
  const providerLabel =
    provider === "gmail"
      ? t.openGmail
      : provider
        ? fa
          ? `باز کردن ${provider}`
          : `Open ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
        : t.openMail;

  return (
    <div className={`text-center ${fa ? "font-fa" : ""}`}>
      <div className="relative mx-auto mb-7 inline-flex h-16 w-16 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-cream/15 animate-pulse-ring"
        />
        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-cream/20 bg-bg-1 text-cream animate-success-pop">
          <MailCheck className="h-7 w-7" strokeWidth={1.8} />
        </span>
      </div>

      <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight">
        {t.successTitle}
      </h1>
      <p className="mt-4 text-[14px] leading-relaxed text-cream/55">
        {t.successBody}
      </p>
      <p className="mt-2 text-[15px] font-medium text-cream break-all">{email}</p>

      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cream/10 px-3 py-1.5 text-[12px] text-cream/55">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-cream/60 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cream/80" />
        </span>
        {t.waiting}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-cream/35 max-w-[320px] mx-auto">
        {t.autoUpdate}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive-foreground text-left animate-slide-down-in"
        >
          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/25 text-[10px] font-bold">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="mt-8 space-y-2.5">
        {providerUrl && (
          <a
            href={providerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="md:hidden w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-cream text-ink text-[14px] font-semibold transition-all hover:bg-cream-bright active:scale-[0.98]"
          >
            <ExternalLink className="h-4 w-4" />
            {providerLabel}
          </a>
        )}

        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0 || resending}
          className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-full border border-cream/12 text-cream/85 text-[14px] font-medium transition-all hover:bg-cream/5 active:scale-[0.98] disabled:opacity-50"
        >
          {resending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : justResent ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>
            {justResent
              ? t.resent
              : resendCooldown > 0
                ? t.resendIn(resendCooldown)
                : t.resend}
          </span>
        </button>

        <button
          type="button"
          onClick={onChangeEmail}
          className="w-full h-11 inline-flex items-center justify-center rounded-full text-[13px] text-cream/55 hover:text-cream transition-colors"
        >
          {t.changeEmail}
        </button>
      </div>
    </div>
  );
}

/* ---------- Floating input ---------- */

function FloatingInput({
  id,
  type,
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  inputMode,
  enterKeyHint,
  required,
  error,
}: {
  id: string;
  type: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "tel" | "url" | "search";
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  required?: boolean;
  error?: string | null;
}) {
  const has = value.length > 0;
  return (
    <div>
      <label
        htmlFor={id}
        className={`group relative block rounded-2xl border bg-transparent transition-colors ${
          error
            ? "border-destructive/50 focus-within:border-destructive"
            : "border-cream/12 focus-within:border-cream/40"
        }`}
      >
        <span
          className={`pointer-events-none absolute left-4 rtl:left-auto rtl:right-4 transition-all text-cream/40 ${
            has
              ? "top-2 text-[11px] tracking-wide"
              : "top-1/2 -translate-y-1/2 text-[14px]"
          } group-focus-within:top-2 group-focus-within:-translate-y-0 group-focus-within:text-[11px] group-focus-within:tracking-wide group-focus-within:text-cream/60`}
        >
          {label}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="block w-full h-14 bg-transparent px-4 pt-5 pb-1 text-[15px] text-cream outline-none placeholder:text-transparent"
          placeholder={label}
        />
      </label>
      {error && (
        <p
          id={`${id}-err`}
          className="mt-1.5 px-1 text-[12px] text-destructive-foreground animate-slide-down-in"
        >
          {error}
        </p>
      )}
    </div>
  );
}
