import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
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

type Step = "credentials" | "verify";
type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("credentials");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState(false);

  // OTP step
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
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
      welcome: fa ? "ورود به ایران" : "Enter IRAN",
      signinSub: fa ? "وارد حساب خود شوید." : "Sign in to continue.",
      signupSub: fa
        ? "حساب جدید بسازید و تماشا را شروع کنید."
        : "Create your account to start watching.",
      email: fa ? "ایمیل" : "Email address",
      password: fa ? "رمز عبور" : "Password",
      continueBtn: fa ? "ادامه" : "Continue",
      signin: fa ? "ورود" : "Sign in",
      signup: fa ? "ساخت حساب" : "Create account",
      sending: fa ? "در حال ارسال…" : "Sending…",
      working: fa ? "در حال ورود…" : "Signing in…",
      back: fa ? "بازگشت" : "Back",
      terms: fa
        ? "با ادامه، شرایط استفاده و سیاست حریم خصوصی را می‌پذیرید."
        : "By continuing, you agree to our Terms and Privacy Policy.",
      invalidEmail: fa ? "ایمیل معتبر وارد کنید." : "Please enter a valid email address.",
      shortPw: fa ? "رمز باید حداقل ۸ نویسه باشد." : "Password must be at least 8 characters.",
      hasAccount: fa ? "حساب دارید؟" : "Already have an account?",
      noAccount: fa ? "حساب ندارید؟" : "Don't have an account?",
      forgot: fa ? "رمز را فراموش کرده‌اید؟" : "Forgot password?",
      // OTP
      verifyTitle: fa ? "ایمیل خود را تأیید کنید" : "Verify your email",
      verifySub: fa ? "کد ۶ رقمی ارسال‌شده را وارد کنید:" : "Enter the 6-digit code we sent to:",
      verifyBtn: fa ? "تأیید" : "Verify",
      verifying: fa ? "در حال تأیید…" : "Verifying…",
      resend: fa ? "ارسال مجدد کد" : "Resend code",
      resendIn: (n: number) => (fa ? `ارسال مجدد در ${n} ثانیه` : `Resend in ${n}s`),
      resent: fa ? "کد دوباره ارسال شد" : "Code resent",
      changeEmail: fa ? "تغییر ایمیل" : "Use a different email",
      otpInvalid: fa ? "کد ۶ رقمی را وارد کنید." : "Enter the 6-digit code.",
    }),
    [fa],
  );

  function humanizeError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("invalid login") || m.includes("invalid credentials")) {
      return fa ? "ایمیل یا رمز عبور نادرست است." : "Incorrect email or password.";
    }
    if (m.includes("user already registered") || m.includes("already exists")) {
      return fa ? "این ایمیل قبلاً ثبت شده است. وارد شوید." : "This email is already registered. Try signing in.";
    }
    if (m.includes("token has expired") || m.includes("invalid token") || m.includes("otp")) {
      return fa ? "کد نامعتبر یا منقضی شده است." : "That code is invalid or expired.";
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return fa ? "تعداد درخواست‌ها زیاد است. کمی صبر کنید." : "Too many attempts — please wait a moment.";
    }
    if (m.includes("email not confirmed")) {
      return fa ? "ابتدا ایمیل خود را تأیید کنید." : "Please verify your email first.";
    }
    return message;
  }

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPwError(null);

    if (!validateEmail(email)) return setEmailError(t.invalidEmail);

    // Phase 1: reveal password after valid email
    if (!revealPassword) {
      setRevealPassword(true);
      window.setTimeout(() => document.getElementById("password")?.focus(), 220);
      return;
    }

    if (password.length < 8) return setPwError(t.shortPw);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (/email not confirmed/i.test(error.message)) {
            await sendSignupOtp();
            setStep("verify");
            setResendCooldown(30);
            return;
          }
          throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error("User already registered");
        }
        setStep("verify");
        setResendCooldown(30);
      }
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  async function sendSignupOtp() {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  }

  async function handleVerify(code: string) {
    setError(null);
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (error) throw error;
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err)));
      setOtp("");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await sendSignupOtp();
      setResendCooldown(30);
      setJustResent(true);
      window.setTimeout(() => setJustResent(false), 2500);
    } catch (err) {
      setError(humanizeError(err instanceof Error ? err.message : String(err)));
    } finally {
      setResending(false);
    }
  }

  function backFromVerify() {
    setStep("credentials");
    setOtp("");
    setError(null);
  }

  return (
    <div
      dir={dir}
      className="relative min-h-[100svh] bg-bg-0 text-cream overflow-hidden flex flex-col"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 md:px-8 md:pt-6">
        {step === "verify" ? (
          <button
            type="button"
            onClick={backFromVerify}
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
        <div key={step} className="w-full max-w-[400px] mx-auto animate-fade-in">
          {step === "credentials" ? (
            <>
              <div className="text-center">
                <h1
                  className={`text-[30px] leading-tight font-semibold tracking-tight md:text-[38px] ${
                    fa ? "font-fa" : "font-display"
                  }`}
                >
                  {t.welcome}
                </h1>
                <p className="mt-4 text-[14px] leading-relaxed text-cream/55 md:text-[15px] max-w-[340px] mx-auto">
                  {mode === "signin" ? t.signinSub : t.signupSub}
                </p>
              </div>

              <form onSubmit={handleCredentials} className="mt-8 space-y-4" noValidate>
                <fieldset disabled={loading} className="space-y-3">
                  <FloatingInput
                    id="email"
                    type="email"
                    label={t.email}
                    value={email}
                    onChange={(v) => {
                      setEmail(v);
                      if (emailError) setEmailError(null);
                      if (revealPassword) setRevealPassword(false);
                    }}
                    onBlur={() => {
                      if (email && !validateEmail(email)) setEmailError(t.invalidEmail);
                    }}
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="next"
                    required
                    error={emailError}
                  />
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      revealPassword
                        ? "grid-rows-[1fr] opacity-100 translate-y-0"
                        : "grid-rows-[0fr] opacity-0 -translate-y-1 pointer-events-none"
                    }`}
                    aria-hidden={!revealPassword}
                  >
                    <div className="overflow-hidden">
                      <FloatingInput
                        id="password"
                        type={showPw ? "text" : "password"}
                        label={t.password}
                        value={password}
                        onChange={(v) => {
                          setPassword(v);
                          if (pwError) setPwError(null);
                        }}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        enterKeyHint="go"
                        required
                        error={pwError}
                        trailing={
                          <button
                            type="button"
                            onClick={() => setShowPw((v) => !v)}
                            aria-label={showPw ? "Hide password" : "Show password"}
                            className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-auto rtl:left-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/40 hover:text-cream/80 transition-colors"
                          >
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />
                    </div>
                  </div>



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
                  <span>
                  {loading
                    ? mode === "signin"
                      ? t.working
                      : t.sending
                    : mode === "signin"
                      ? t.signin
                      : t.signup}
                  </span>
                </button>
              </form>

              <div className="mt-6 flex items-center justify-center text-[13px] text-cream/55">
                <span>{mode === "signin" ? t.noAccount : t.hasAccount}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                    setPwError(null);
                  }}
                  className="ms-2 text-cream hover:underline font-medium"
                >
                  {mode === "signin" ? t.signup : t.signin}
                </button>
              </div>

              {mode === "signin" && (
                <div className="mt-3 text-center">
                  <Link
                    to="/reset-password"
                    className="text-[12px] text-cream/40 hover:text-cream/70 transition-colors"
                  >
                    {t.forgot}
                  </Link>
                </div>
              )}


              <p className="mt-8 text-center text-[11px] leading-relaxed text-cream/30 px-4">
                {t.terms}
              </p>
            </>
          ) : (
            <VerifyView
              email={email}
              fa={fa}
              t={t}
              otp={otp}
              setOtp={setOtp}
              verifying={verifying}
              onVerify={handleVerify}
              resendCooldown={resendCooldown}
              resending={resending}
              justResent={justResent}
              onResend={handleResend}
              onChangeEmail={backFromVerify}
              error={error}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- Verify (OTP) view ---------- */

function VerifyView({
  email,
  fa,
  t,
  otp,
  setOtp,
  verifying,
  onVerify,
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
    verifyTitle: string;
    verifySub: string;
    verifyBtn: string;
    verifying: string;
    resend: string;
    resendIn: (n: number) => string;
    resent: string;
    changeEmail: string;
    otpInvalid: string;
  };
  otp: string;
  setOtp: (v: string) => void;
  verifying: boolean;
  onVerify: (code: string) => void;
  resendCooldown: number;
  resending: boolean;
  justResent: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedFor = useRef<string>("");

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, []);

  // Auto-submit once 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !verifying && submittedFor.current !== otp) {
      submittedFor.current = otp;
      onVerify(otp);
    }
  }, [otp, verifying, onVerify]);

  const digits = Array.from({ length: 6 }, (_, i) => otp[i] ?? "");
  const activeIndex = Math.min(otp.length, 5);

  return (
    <div className={`text-center ${fa ? "font-fa" : ""}`}>
      <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight">
        {t.verifyTitle}
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-cream/55">
        {t.verifySub}
      </p>
      <p className="mt-1 text-[15px] font-medium text-cream break-all">{email}</p>

      {/* OTP boxes */}
      <div
        className="mt-8 relative"
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={otp}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setOtp(v);
            if (v.length < 6) submittedFor.current = "";
          }}
          disabled={verifying}
          aria-label="Verification code"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
        <div dir="ltr" className="flex items-center justify-center gap-2 sm:gap-2.5 pointer-events-none">
          {digits.map((d, i) => {
            const isActive = i === activeIndex && !verifying;
            const filled = d !== "";
            return (
              <div
                key={i}
                className={[
                  "relative flex items-center justify-center",
                  "h-12 w-9 sm:h-14 sm:w-11 rounded-xl border text-[18px] sm:text-[20px] font-semibold tabular-nums transition-all duration-150",
                  filled
                    ? "border-cream/60 bg-white/5 text-cream"
                    : "border-cream/12 text-cream/40",
                  isActive ? "border-cream ring-2 ring-cream/20" : "",
                  verifying ? "opacity-60" : "",
                ].join(" ")}
              >
                <span>{d}</span>
                {isActive && !filled && (
                  <span className="absolute h-5 w-px bg-cream animate-caret-blink" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 min-h-[24px] flex items-center justify-center">
        {verifying ? (
          <span className="inline-flex items-center gap-2 text-[13px] text-cream/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.verifying}
          </span>
        ) : null}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-1 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive-foreground text-left animate-slide-down-in"
        >
          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/25 text-[10px] font-bold">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0 || resending}
          className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-full border border-cream/12 text-cream/85 text-[13px] font-medium transition-all hover:bg-cream/5 active:scale-[0.98] disabled:opacity-50"
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
          className="w-full h-10 inline-flex items-center justify-center rounded-full text-[12.5px] text-cream/55 hover:text-cream transition-colors"
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
  trailing,
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
  trailing?: React.ReactNode;
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
          className={`block w-full h-14 bg-transparent px-4 pt-5 pb-1 text-[15px] text-cream outline-none placeholder:text-transparent ${
            trailing ? "pe-12" : ""
          }`}
          placeholder={label}
        />
        {trailing}
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
