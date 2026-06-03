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

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase fires PASSWORD_RECOVERY when the recovery link sets the session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const tr = {
    title: fa ? "بازنشانی رمز عبور" : "Reset password",
    sub: fa ? "یک رمز عبور جدید برای حساب خود تنظیم کنید." : "Set a new password for your account.",
    newPw: fa ? "رمز عبور جدید" : "New password",
    confirmPw: fa ? "تکرار رمز عبور" : "Confirm password",
    submit: fa ? "ذخیره رمز جدید" : "Save new password",
    waiting: fa ? "در حال بررسی لینک بازنشانی…" : "Verifying reset link…",
    invalid: fa ? "لینک نامعتبر یا منقضی است. دوباره درخواست دهید." : "Invalid or expired link. Request a new one.",
    success: fa ? "رمز عبور با موفقیت تغییر کرد." : "Password updated successfully.",
    continue: fa ? "ادامه" : "Continue",
    mismatch: fa ? "رمزها مطابقت ندارند" : "Passwords do not match",
    tooShort: fa ? "حداقل ۸ کاراکتر" : "Minimum 8 characters",
    backToSignIn: fa ? "بازگشت به ورود" : "Back to sign in",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError(tr.tooShort); return; }
    if (password !== confirm) { setError(tr.mismatch); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="px-6 py-6">
        <Link to="/"><Logo /></Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md hairline rounded-2xl border bg-bg-1/40 p-8">
          <h1 className={`text-2xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {tr.title}
          </h1>
          <p className="mt-1 text-sm text-cream/60">{tr.sub}</p>

          {done ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-amber">{tr.success}</p>
              <button
                type="button"
                onClick={() => navigate({ to: "/account", replace: true })}
                className="w-full rounded-full bg-cream px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream-bright"
              >
                {tr.continue}
              </button>
            </div>
          ) : !ready ? (
            <p className="mt-8 text-sm text-cream/60">{tr.waiting}</p>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
                className="w-full rounded-full bg-cream px-5 py-2.5 text-sm font-medium text-ink hover:bg-cream-bright disabled:opacity-60"
              >
                {loading ? "…" : tr.submit}
              </button>
              <Link to="/auth" className="block text-center text-xs text-cream/60 hover:text-cream">
                {tr.backToSignIn}
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
