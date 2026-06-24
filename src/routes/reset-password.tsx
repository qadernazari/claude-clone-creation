import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — IRAN" },
      { name: "description", content: "Set a new password for your IRAN account." },
    ],
  }),
  component: ResetPasswordPage,
});

type Stage = "request" | "sent" | "reset" | "done" | "checking";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  // Decide initial stage: if URL hash carries recovery tokens, we're checking; otherwise show the request form.
  const hasRecoveryHash =
    typeof window !== "undefined" &&
    (window.location.hash.includes("type=recovery") ||
      window.location.hash.includes("access_token"));

  const [stage, setStage] = useState<Stage>(hasRecoveryHash ? "checking" : "request");

  // Request-email state
  const [email, setEmail] = useState("");

  // New-password state
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for PASSWORD_RECOVERY (fires when Supabase parses the URL hash).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStage("reset");
        setError(null);
      }
    });

    // If we landed here with a recovery hash, give Supabase a moment to parse it.
    // If after a short window we still have no recovery session, show an error and let the user request a new email.
    if (hasRecoveryHash) {
      const timer = window.setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setStage("request");
          setError(
            fa
              ? "لینک بازنشانی نامعتبر یا منقضی است. لطفاً دوباره درخواست دهید."
              : "That reset link is invalid or expired. Please request a new one."
          );
        } else {
          // Session is set but PASSWORD_RECOVERY may have already fired before mount.
          setStage("reset");
        }
      }, 1500);
      return () => {
        window.clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tr = {
    title: fa ? "بازنشانی رمز عبور" : "Reset password",
    requestSub: fa
      ? "ایمیل حساب خود را وارد کنید تا لینک بازنشانی ارسال شود."
      : "Enter your account email and we'll send you a link to set a new password.",
    resetSub: fa ? "یک رمز عبور جدید برای حساب خود تنظیم کنید." : "Set a new password for your account.",
    sentTitle: fa ? "ایمیل ارسال شد" : "Check your email",
    sentSub: (e: string) =>
      fa
        ? `اگر حسابی با ${e} وجود داشته باشد، لینک بازنشانی ارسال شد. لینک ۶۰ دقیقه معتبر است.`
        : `If an account exists for ${e}, we've sent a reset link. The link is valid for 60 minutes.`,
    email: fa ? "ایمیل" : "Email",
    sendBtn: fa ? "ارسال لینک بازنشانی" : "Send reset link",
    newPw: fa ? "رمز عبور جدید" : "New password",
    confirmPw: fa ? "تکرار رمز عبور" : "Confirm password",
    submit: fa ? "ذخیره رمز جدید" : "Save new password",
    waiting: fa ? "در حال بررسی لینک بازنشانی…" : "Verifying reset link…",
    success: fa ? "رمز عبور با موفقیت تغییر کرد." : "Password updated successfully.",
    continue: fa ? "ادامه" : "Continue",
    mismatch: fa ? "رمزها مطابقت ندارند" : "Passwords do not match",
    tooShort: fa ? "حداقل ۸ کاراکتر" : "Minimum 8 characters",
    invalidEmail: fa ? "ایمیل نامعتبر است" : "Enter a valid email",
    backToSignIn: fa ? "بازگشت به ورود" : "Back to sign in",
    resend: fa ? "ارسال مجدد" : "Resend email",
  };

  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validEmail(email)) { setError(tr.invalidEmail); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStage("sent");
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError(tr.tooShort); return; }
    if (password !== confirm) { setError(tr.mismatch); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStage("done");
  }

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="px-6 py-6">
        <Link to="/"><Logo /></Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md hairline rounded-2xl border bg-bg-1/40 p-8">
          <h1 className={`text-2xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {stage === "sent" ? tr.sentTitle : tr.title}
          </h1>
          <p className="mt-1 text-sm text-cream/60">
            {stage === "reset" || stage === "done"
              ? tr.resetSub
              : stage === "sent"
                ? tr.sentSub(email)
                : tr.requestSub}
          </p>

          {/* Stage: checking the recovery hash */}
          {stage === "checking" && (
            <p className="mt-8 text-sm text-cream/60">{tr.waiting}</p>
          )}

          {/* Stage: request reset email */}
          {stage === "request" && (
            <form onSubmit={onRequest} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-cream/55">{tr.email}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  dir="ltr"
                  className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
                />
              </label>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-cream px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream-bright disabled:opacity-60"
              >
                {loading ? "…" : tr.sendBtn}
              </button>
              <Link to="/auth" className="block text-center text-xs text-cream/60 hover:text-cream">
                {tr.backToSignIn}
              </Link>
            </form>
          )}

          {/* Stage: email sent */}
          {stage === "sent" && (
            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={() => { setStage("request"); setError(null); }}
                className="w-full rounded-md border border-cream/20 px-5 py-2.5 text-sm font-medium text-cream hover:bg-cream/5"
              >
                {tr.resend}
              </button>
              <Link to="/auth" className="block text-center text-xs text-cream/60 hover:text-cream">
                {tr.backToSignIn}
              </Link>
            </div>
          )}

          {/* Stage: set new password (recovery session present) */}
          {stage === "reset" && (
            <form onSubmit={onReset} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-cream/55">{tr.newPw}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-cream/55">{tr.confirmPw}</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="mt-2 w-full rounded-md border border-cream/15 bg-bg-0 px-3 py-2 text-cream outline-none focus:border-amber"
                />
              </label>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-cream px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream-bright disabled:opacity-60"
              >
                {loading ? "…" : tr.submit}
              </button>
            </form>
          )}

          {/* Stage: done */}
          {stage === "done" && (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-amber">{tr.success}</p>
              <button
                type="button"
                onClick={() => navigate({ to: "/account", replace: true })}
                className="w-full rounded-md bg-cream px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream-bright"
              >
                {tr.continue}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
