import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "apple">(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function safeRedirect() {
    // Only allow internal redirects (start with /, not //)
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      window.location.replace(redirectTo);
    } else {
      navigate({ to: "/", replace: true });
    }
  }

  // Redirect once authenticated
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

  const t = {
    signIn: fa ? "ورود" : "Sign in",
    signUp: fa ? "ثبت نام" : "Create account",
    forgot: fa ? "رمز عبور را فراموش کرده‌اید؟" : "Forgot password?",
    forgotTitle: fa ? "بازنشانی رمز عبور" : "Reset your password",
    forgotSub: fa
      ? "ایمیل خود را وارد کنید تا لینک بازنشانی برایتان ارسال شود."
      : "Enter your email and we'll send you a reset link.",
    sendLink: fa ? "ارسال لینک بازنشانی" : "Send reset link",
    backToSignIn: fa ? "بازگشت به ورود" : "Back to sign in",
    email: fa ? "ایمیل" : "Email",
    password: fa ? "رمز عبور" : "Password",
    fullName: fa ? "نام کامل" : "Full name",
    google: fa ? "ادامه با گوگل" : "Continue with Google",
    apple: fa ? "ادامه با اپل" : "Continue with Apple",
    or: fa ? "یا با ایمیل ادامه دهید" : "or continue with email",
    haveAcct: fa ? "حساب دارید؟" : "Already have an account?",
    noAcct: fa ? "حساب ندارید؟" : "New to IRAN?",
    welcome: fa ? "به IRAN خوش آمدید" : "Welcome to IRAN",
    welcomeBack: fa ? "خوش برگشتید" : "Welcome back",
    join: fa ? "به ما بپیوندید" : "Create your account",
    subSignIn: fa
      ? "وارد شوید تا تماشا، کتابخانه و تاریخچه‌تان همراهتان باشد."
      : "Sign in to watch, save, and continue where you left off.",
    subSignUp: fa
      ? "حسابی بسازید و از سینمای مستقل ایرانی حمایت کنید."
      : "Join to stream curated Iranian cinema and support filmmakers.",
    checkEmail: fa
      ? "ایمیل خود را برای تأیید بررسی کنید."
      : "Check your email to confirm your account.",
    checkEmailReset: fa
      ? "اگر این ایمیل ثبت شده باشد، لینک بازنشانی ارسال شد."
      : "If that email is registered, a reset link is on the way.",
    back: fa ? "بازگشت" : "Back",
    continueText: loading
      ? fa
        ? "لطفاً صبر کنید…"
        : "Please wait…"
      : null,
    terms: fa
      ? "با ادامه، شرایط استفاده و سیاست حریم خصوصی را می‌پذیرید."
      : "By continuing, you agree to our Terms and Privacy Policy.",
    show: fa ? "نمایش" : "Show",
    hide: fa ? "پنهان" : "Hide",
  };

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, locale },
          },
        });
        if (error) throw error;
        setInfo(t.checkEmail);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo(t.checkEmailReset);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    setOauthLoading(provider);
    try {
      const target = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? `${window.location.origin}${redirectTo}`
        : window.location.origin;
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: target });
      if (result.error) {
        setError(result.error.message ?? `${provider} sign-in failed`);
        setOauthLoading(null);
        return;
      }
      if (result.redirected) return;
      safeRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOauthLoading(null);
    }
  }

  const isForgot = mode === "forgot";
  const isSignUp = mode === "signup";

  const heading = isForgot ? t.forgotTitle : isSignUp ? t.join : t.welcomeBack;
  const subheading = isForgot ? t.forgotSub : isSignUp ? t.subSignUp : t.subSignIn;

  return (
    <div
      dir={dir}
      className="relative min-h-[100svh] bg-bg-0 text-cream overflow-hidden flex flex-col"
    >
      {/* Ambient brand glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-amber/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-amber-bright/8 blur-[140px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-0/40 to-bg-0" />
      </div>

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 md:px-8 md:pt-6"
      >
        <Link
          to="/"
          aria-label={t.back}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 bg-bg-1/60 text-cream/80 backdrop-blur-md transition-colors hover:bg-cream/10 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <Link to="/" className="inline-flex items-center gap-2">
          <Logo size={32} />
        </Link>
        <div className="h-10 w-10" aria-hidden />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] md:px-8">
        <div className="w-full max-w-[420px] mx-auto">
          {/* Heading */}
          <div className="text-center md:text-left animate-fade-in">
            <h1
              className={`text-[28px] leading-tight font-semibold tracking-tight md:text-4xl ${
                fa ? "font-fa" : "font-display"
              }`}
            >
              {heading}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-cream/60 md:text-base">
              {subheading}
            </p>
          </div>

          {/* Mode tabs (hidden in forgot) */}
          {!isForgot && (
            <div className="mt-7 grid grid-cols-2 rounded-full border border-cream/12 bg-bg-1/60 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`h-10 rounded-full text-[13px] font-medium transition-all ${
                  mode === "signin"
                    ? "bg-cream text-ink shadow-sm"
                    : "text-cream/60 hover:text-cream"
                }`}
              >
                {t.signIn}
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`h-10 rounded-full text-[13px] font-medium transition-all ${
                  mode === "signup"
                    ? "bg-cream text-ink shadow-sm"
                    : "text-cream/60 hover:text-cream"
                }`}
              >
                {t.signUp}
              </button>
            </div>
          )}

          {/* OAuth buttons (hidden in forgot) */}
          {!isForgot && (
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={loading || oauthLoading !== null}
                className="group relative w-full h-12 inline-flex items-center justify-center gap-3 rounded-full bg-cream text-ink text-[14px] font-medium transition-all hover:bg-cream-bright active:scale-[0.98] disabled:opacity-60"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{t.google}</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("apple")}
                disabled={loading || oauthLoading !== null}
                className="group relative w-full h-12 inline-flex items-center justify-center gap-3 rounded-full border border-cream/15 bg-bg-1/70 text-cream text-[14px] font-medium backdrop-blur-md transition-all hover:bg-bg-1 active:scale-[0.98] disabled:opacity-60"
              >
                {oauthLoading === "apple" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AppleIcon />
                )}
                <span>{t.apple}</span>
              </button>
            </div>
          )}

          {/* Divider */}
          {!isForgot && (
            <div className="my-6 flex items-center gap-3" aria-hidden>
              <div className="h-px flex-1 bg-cream/10" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-cream/40">
                {t.or}
              </span>
              <div className="h-px flex-1 bg-cream/10" />
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleEmail}
            className={`space-y-3 ${isForgot ? "mt-7" : ""}`}
            noValidate
          >
            {isSignUp && (
              <FloatingInput
                id="fullName"
                type="text"
                label={t.fullName}
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
              />
            )}

            <FloatingInput
              id="email"
              type="email"
              label={t.email}
              value={email}
              onChange={setEmail}
              autoComplete="email"
              inputMode="email"
              required
              leadingIcon={isForgot ? <Mail className="h-4 w-4" /> : undefined}
            />

            {!isForgot && (
              <FloatingInput
                id="password"
                type={showPassword ? "text" : "password"}
                label={t.password}
                value={password}
                onChange={setPassword}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t.hide : t.show}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/50 hover:text-cream transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            )}

            {/* Forgot link (signin only) */}
            {mode === "signin" && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-[13px] text-cream/60 hover:text-cream underline-offset-4 hover:underline transition-colors"
                >
                  {t.forgot}
                </button>
              </div>
            )}

            {/* Status messages */}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive-foreground"
              >
                {error}
              </p>
            )}
            {info && (
              <p
                role="status"
                className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2.5 text-[13px] text-amber-bright"
              >
                {info}
              </p>
            )}

            {/* Primary action */}
            <button
              type="submit"
              disabled={loading || oauthLoading !== null}
              className="mt-2 w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-amber text-ink text-[14px] font-semibold tracking-wide transition-all hover:bg-amber-bright active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>
                  {isForgot ? t.sendLink : isSignUp ? t.signUp : t.signIn}
                </span>
              )}
            </button>

            {isForgot && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="mt-1 w-full h-11 inline-flex items-center justify-center rounded-full text-[13px] text-cream/70 hover:text-cream transition-colors"
              >
                ← {t.backToSignIn}
              </button>
            )}
          </form>

          {/* Footer swap */}
          {!isForgot && (
            <p className="mt-6 text-center text-[13px] text-cream/55">
              {mode === "signin" ? t.noAcct : t.haveAcct}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                className="text-cream font-medium underline-offset-4 hover:underline"
              >
                {mode === "signin" ? t.signUp : t.signIn}
              </button>
            </p>
          )}

          <p className="mt-5 text-center text-[11px] leading-relaxed text-cream/35 px-4">
            {t.terms}
          </p>
        </div>
      </main>
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
  autoComplete,
  inputMode,
  required,
  minLength,
  leadingIcon,
  trailing,
}: {
  id: string;
  type: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "tel" | "url" | "search";
  required?: boolean;
  minLength?: number;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const has = value.length > 0;
  return (
    <label
      htmlFor={id}
      className="group relative block rounded-2xl border border-cream/12 bg-bg-1/60 backdrop-blur-md transition-colors focus-within:border-amber/60 focus-within:bg-bg-1/80"
    >
      <span
        className={`pointer-events-none absolute left-4 rtl:left-auto rtl:right-4 transition-all text-cream/45 ${
          has
            ? "top-2 text-[11px] tracking-wide"
            : "top-1/2 -translate-y-1/2 text-[14px]"
        } group-focus-within:top-2 group-focus-within:-translate-y-0 group-focus-within:text-[11px] group-focus-within:tracking-wide group-focus-within:text-amber`}
      >
        {label}
      </span>
      {leadingIcon && (
        <span className="pointer-events-none absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 text-cream/40">
          {leadingIcon}
        </span>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        minLength={minLength}
        className="block w-full h-14 bg-transparent px-4 pt-5 pb-1 text-[15px] text-cream outline-none placeholder:text-transparent"
        placeholder={label}
      />
      {trailing && (
        <span className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2">
          {trailing}
        </span>
      )}
    </label>
  );
}

/* ---------- Icons ---------- */

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.235-1.18 3.05-.81.87-2.13 1.55-3.22 1.46-.13-1.1.42-2.26 1.16-3.04.83-.87 2.24-1.52 3.24-1.47zM20.5 17.32c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.38 3.5-4.1 3.51-1.53.02-1.92-.99-4-.98-2.07.01-2.5 1-4.03.98-1.72-.02-3.04-1.77-4.02-3.33-2.75-4.37-3.04-9.5-1.34-12.23 1.21-1.94 3.12-3.08 4.92-3.08 1.83 0 2.98 1 4.5 1 1.47 0 2.36-1 4.48-1 1.6 0 3.3.88 4.52 2.4-3.97 2.18-3.32 7.85.59 9.77z" />
    </svg>
  );
}
