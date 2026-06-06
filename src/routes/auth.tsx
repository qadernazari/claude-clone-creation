import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
} from "lucide-react";
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
type SuccessKind = "signup" | "reset";

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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "apple">(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | { kind: SuccessKind; email: string }>(null);
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

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

  const t = useMemo(
    () => ({
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
      fullName: fa ? "نام کامل (اختیاری)" : "Full name (optional)",
      google: fa ? "ادامه با گوگل" : "Continue with Google",
      apple: fa ? "ادامه با اپل" : "Continue with Apple",
      or: fa ? "یا با ایمیل ادامه دهید" : "or continue with email",
      haveAcct: fa ? "حساب دارید؟" : "Already have an account?",
      noAcct: fa ? "حساب ندارید؟" : "New to IRAN?",
      welcomeBack: fa ? "خوش برگشتید" : "Welcome back",
      join: fa ? "به ما بپیوندید" : "Create your account",
      subSignIn: fa
        ? "وارد شوید تا تماشا، کتابخانه و تاریخچه‌تان همراهتان باشد."
        : "Sign in to watch, save, and continue where you left off.",
      subSignUp: fa
        ? "حسابی بسازید و از سینمای مستقل ایرانی حمایت کنید."
        : "Join to stream curated Iranian cinema and support filmmakers.",
      back: fa ? "بازگشت" : "Back",
      terms: fa
        ? "با ادامه، شرایط استفاده و سیاست حریم خصوصی را می‌پذیرید."
        : "By continuing, you agree to our Terms and Privacy Policy.",
      show: fa ? "نمایش" : "Show",
      hide: fa ? "پنهان" : "Hide",
      // Loading labels
      signingIn: fa ? "در حال ورود…" : "Signing you in…",
      creating: fa ? "در حال ساخت حساب…" : "Creating your account…",
      sending: fa ? "در حال ارسال لینک…" : "Sending link…",
      // Success screen
      successSignupTitle: fa ? "ایمیل خود را بررسی کنید" : "Check your inbox",
      successResetTitle: fa ? "لینک بازنشانی ارسال شد" : "Reset link on the way",
      successSignupBody: fa
        ? "لینک تأیید امن را به این آدرس ارسال کردیم:"
        : "We've sent a secure sign-in link to:",
      successResetBody: fa
        ? "اگر این ایمیل ثبت شده باشد، لینک بازنشانی به این آدرس ارسال می‌شود:"
        : "If that email is registered, a reset link is on its way to:",
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
      // Validation
      invalidEmail: fa ? "ایمیل معتبر وارد کنید." : "Please enter a valid email address.",
    }),
    [fa],
  );

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setEmailError(null);
  }

  function humanizeError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials")) {
      return fa
        ? "ایمیل یا رمز عبور اشتباه است."
        : "That email and password don't match.";
    }
    if (m.includes("user already registered") || m.includes("already been registered")) {
      return fa
        ? "این ایمیل قبلاً ثبت شده — لطفاً وارد شوید."
        : "An account with this email already exists — try signing in instead.";
    }
    if (m.includes("email not confirmed")) {
      return fa
        ? "ایمیل شما هنوز تأیید نشده. لطفاً صندوق ورودی را بررسی کنید."
        : "Your email isn't confirmed yet — please check your inbox.";
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return fa
        ? "تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید."
        : "Too many attempts — please wait a moment and try again.";
    }
    if (m.includes("password") && m.includes("6")) {
      return fa
        ? "رمز عبور باید حداقل ۶ کاراکتر باشد."
        : "Password must be at least 6 characters.";
    }
    return message;
  }

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    if (!validateEmail(email)) {
      setEmailError(t.invalidEmail);
      return;
    }
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
        setSuccess({ kind: "signup", email });
        setResendCooldown(30);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess({ kind: "reset", email });
        setResendCooldown(30);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
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
      if (success.kind === "signup") {
        const { error } = await supabase.auth.signUp({
          email: success.email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, locale },
          },
        });
        if (error && !error.message.toLowerCase().includes("already")) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(success.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      }
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

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    setOauthLoading(provider);
    try {
      const target = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? `${window.location.origin}${redirectTo}`
        : window.location.origin;
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: target });
      if (result.error) {
        setError(humanizeError(result.error.message ?? `${provider} sign-in failed`));
        setOauthLoading(null);
        return;
      }
      if (result.redirected) return;
      safeRedirect();
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err)));
      setOauthLoading(null);
    }
  }

  const isForgot = mode === "forgot";
  const isSignUp = mode === "signup";

  const heading = isForgot ? t.forgotTitle : isSignUp ? t.join : t.welcomeBack;
  const subheading = isForgot ? t.forgotSub : isSignUp ? t.subSignUp : t.subSignIn;

  const submitLabel = loading
    ? isForgot
      ? t.sending
      : isSignUp
        ? t.creating
        : t.signingIn
    : isForgot
      ? t.sendLink
      : isSignUp
        ? t.signUp
        : t.signIn;

  // animation key — re-mounts inner block on mode/success change for cross-fade
  const viewKey = success ? `success-${success.kind}` : mode;

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
      <header className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 md:px-8 md:pt-6">
        {success ? (
          <button
            type="button"
            onClick={backToForm}
            aria-label={t.back}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 bg-bg-1/60 text-cream/80 backdrop-blur-md transition-colors hover:bg-cream/10 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
        ) : (
          <Link
            to="/"
            aria-label={t.back}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 bg-bg-1/60 text-cream/80 backdrop-blur-md transition-colors hover:bg-cream/10 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
        )}
        <Link to="/" className="inline-flex items-center gap-2">
          <Logo size={32} />
        </Link>
        <div className="h-10 w-10" aria-hidden />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] md:px-8">
        <div key={viewKey} className="w-full max-w-[420px] mx-auto animate-fade-in">
          {success ? (
            <SuccessView
              kind={success.kind}
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
              {/* Heading */}
              <div className="text-center md:text-left">
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
                <div className="relative mt-7 grid grid-cols-2 rounded-full border border-cream/12 bg-bg-1/60 p-1 backdrop-blur-md">
                  <span
                    aria-hidden
                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-cream shadow-sm transition-transform duration-300 ease-out"
                    style={{
                      transform:
                        mode === "signup"
                          ? dir === "rtl"
                            ? "translateX(-100%)"
                            : "translateX(100%)"
                          : "translateX(0)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className={`relative z-10 h-10 rounded-full text-[13px] font-medium transition-colors ${
                      mode === "signin" ? "text-ink" : "text-cream/60 hover:text-cream"
                    }`}
                  >
                    {t.signIn}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className={`relative z-10 h-10 rounded-full text-[13px] font-medium transition-colors ${
                      mode === "signup" ? "text-ink" : "text-cream/60 hover:text-cream"
                    }`}
                  >
                    {t.signUp}
                  </button>
                </div>
              )}

              {/* OAuth buttons (hidden in forgot) */}
              {!isForgot && (
                <div className="mt-5 space-y-2.5">
                  <OAuthButton
                    provider="google"
                    label={t.google}
                    loading={oauthLoading === "google"}
                    dimmed={oauthLoading !== null && oauthLoading !== "google"}
                    disabled={loading || oauthLoading !== null}
                    onClick={() => handleOAuth("google")}
                    variant="light"
                  >
                    <GoogleIcon />
                  </OAuthButton>
                  <OAuthButton
                    provider="apple"
                    label={t.apple}
                    loading={oauthLoading === "apple"}
                    dimmed={oauthLoading !== null && oauthLoading !== "apple"}
                    disabled={loading || oauthLoading !== null}
                    onClick={() => handleOAuth("apple")}
                    variant="dark"
                  >
                    <AppleIcon />
                  </OAuthButton>
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
                <fieldset disabled={loading || oauthLoading !== null} className="space-y-3 contents">
                  {isSignUp && (
                    <FloatingInput
                      id="fullName"
                      type="text"
                      label={t.fullName}
                      value={fullName}
                      onChange={setFullName}
                      autoComplete="name"
                      enterKeyHint="next"
                    />
                  )}

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
                    enterKeyHint={isForgot ? "send" : "next"}
                    required
                    error={emailError}
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
                      enterKeyHint="go"
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
                </fieldset>

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

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive-foreground animate-slide-down-in"
                  >
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/30 text-[10px] font-bold">
                      !
                    </span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Primary action */}
                <button
                  type="submit"
                  disabled={loading || oauthLoading !== null}
                  className="mt-2 w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-amber text-ink text-[14px] font-semibold tracking-wide transition-all hover:bg-amber-bright active:scale-[0.98] disabled:opacity-70"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{submitLabel}</span>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- Success view ---------- */

function SuccessView({
  kind,
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
  kind: SuccessKind;
  email: string;
  fa: boolean;
  t: ReturnType<typeof useAuthCopy>;
  resendCooldown: number;
  resending: boolean;
  justResent: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
  error: string | null;
}) {
  const title = kind === "signup" ? t.successSignupTitle : t.successResetTitle;
  const body = kind === "signup" ? t.successSignupBody : t.successResetBody;

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
      {/* Icon with pulse */}
      <div className="relative mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-amber/20 animate-pulse-ring"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-amber/10"
          style={{ animationDelay: "1s" }}
        />
        <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber to-amber-bright text-ink shadow-[0_10px_40px_-10px_rgba(255,180,60,0.55)] animate-success-pop">
          {kind === "signup" ? (
            <MailCheck className="h-9 w-9" strokeWidth={2.2} />
          ) : (
            <CheckCircle2 className="h-9 w-9" strokeWidth={2.2} />
          )}
        </span>
      </div>

      <h1 className="text-[26px] md:text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-cream/65">
        {body}
      </p>
      <p className="mt-2 text-[15px] font-medium text-cream break-all">{email}</p>

      {/* Waiting indicator */}
      {kind === "signup" && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cream/12 bg-bg-1/60 px-3 py-1.5 text-[12px] text-cream/65 backdrop-blur-md">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-amber/70 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
          </span>
          {t.waiting}
        </div>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-cream/45 max-w-[320px] mx-auto">
        {t.autoUpdate}
      </p>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive-foreground text-left animate-slide-down-in"
        >
          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/30 text-[10px] font-bold">!</span>
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-7 space-y-2.5">
        {providerUrl && (
          <a
            href={providerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="md:hidden w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-amber text-ink text-[14px] font-semibold transition-all hover:bg-amber-bright active:scale-[0.98]"
          >
            <ExternalLink className="h-4 w-4" />
            {providerLabel}
          </a>
        )}

        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0 || resending}
          className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-full border border-cream/15 bg-bg-1/70 text-cream text-[14px] font-medium backdrop-blur-md transition-all hover:bg-bg-1 active:scale-[0.98] disabled:opacity-60"
        >
          {resending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : justResent ? (
            <CheckCircle2 className="h-4 w-4 text-amber" />
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
          className="w-full h-11 inline-flex items-center justify-center rounded-full text-[13px] text-cream/70 hover:text-cream transition-colors"
        >
          {t.changeEmail}
        </button>
      </div>
    </div>
  );
}

// Type helper so SuccessView's `t` prop infers correctly from the inline t object.
// (Kept as a function for type inference only — not called at runtime.)
function useAuthCopy() {
  return {} as {
    successSignupTitle: string;
    successResetTitle: string;
    successSignupBody: string;
    successResetBody: string;
    autoUpdate: string;
    openMail: string;
    openGmail: string;
    resend: string;
    resendIn: (n: number) => string;
    resent: string;
    changeEmail: string;
    waiting: string;
  };
}

/* ---------- OAuth button ---------- */

function OAuthButton({
  label,
  loading,
  dimmed,
  disabled,
  onClick,
  variant,
  children,
}: {
  provider: "google" | "apple";
  label: string;
  loading: boolean;
  dimmed: boolean;
  disabled: boolean;
  onClick: () => void;
  variant: "light" | "dark";
  children: React.ReactNode;
}) {
  const base =
    variant === "light"
      ? "bg-cream text-ink hover:bg-cream-bright"
      : "border border-cream/15 bg-bg-1/70 text-cream backdrop-blur-md hover:bg-bg-1";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full h-12 inline-flex items-center justify-center gap-3 rounded-full text-[14px] font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed ${base} ${
        dimmed ? "opacity-40" : "opacity-100"
      } ${loading ? "ring-2 ring-amber/40" : ""}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      <span>{label}</span>
    </button>
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
  minLength,
  leadingIcon,
  trailing,
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
  minLength?: number;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  error?: string | null;
}) {
  const has = value.length > 0;
  return (
    <div>
      <label
        htmlFor={id}
        className={`group relative block rounded-2xl border bg-bg-1/60 backdrop-blur-md transition-colors ${
          error
            ? "border-destructive/60 focus-within:border-destructive"
            : "border-cream/12 focus-within:border-amber/60 focus-within:bg-bg-1/80"
        }`}
      >
        <span
          className={`pointer-events-none absolute left-4 rtl:left-auto rtl:right-4 transition-all text-cream/45 ${
            has
              ? "top-2 text-[11px] tracking-wide"
              : "top-1/2 -translate-y-1/2 text-[14px]"
          } group-focus-within:top-2 group-focus-within:-translate-y-0 group-focus-within:text-[11px] group-focus-within:tracking-wide ${
            error ? "group-focus-within:text-destructive" : "group-focus-within:text-amber"
          }`}
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
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          required={required}
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="block w-full h-14 bg-transparent px-4 pt-5 pb-1 text-[15px] text-cream outline-none placeholder:text-transparent"
          placeholder={label}
        />
        {trailing && (
          <span className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        )}
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
      <path d="M16.365 1.43c0 1.14-.42 2.235-1.18 3.05-.81.87-2.13 1.55-3.22 1.46-.13-1.1.42-2.26 1.16-3.04.83-.87 2.24-1.52 3.24-1.47zM20.5 17.32c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.38 3.5-4.1 3.51-1.53.02-1.92-.99-4-.98-2.07.01-2.5 1-4.03.98-1.72-.02-3.04-1.77-4.02-3.33-2.75-4.37-3.04-9.5-1.34-12.23 1.21-1.94 3.12-3.08 4.92-3.08 1.83 0 2.98 1 4.5 1 1.47 0 2.36-1 4.48-1 1.6 0 3.3.88 4.52 2.4-3.97 2.18-3.32 7.65.59 9.77z" />
    </svg>
  );
}
