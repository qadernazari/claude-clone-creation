import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

export function AuthMenu() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="text-sm rounded-full border border-cream/20 px-4 py-1.5 text-cream/90 hover:bg-cream/10 transition-colors"
      >
        {fa ? "ورود" : "Sign in"}
      </Link>
    );
  }

  const initial = (user.user_metadata?.full_name || user.email || "?")[0]?.toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-9 rounded-full bg-cream/10 text-cream text-sm font-medium hover:bg-cream/20 transition-colors"
        aria-label="Account menu"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-56 rounded-md border border-cream/15 bg-bg-1 p-1 shadow-lg z-50">
          <div className="px-3 py-2 text-xs text-cream/60 truncate">{user.email}</div>
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
          >
            {fa ? "حساب کاربری" : "Account"}
          </Link>
          <Link
            to="/my-tickets"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
          >
            {fa ? "بلیط‌های من" : "My tickets"}
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="w-full text-start rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
          >
            {fa ? "خروج" : "Sign out"}
          </button>
        </div>
      )}

    </div>
  );
}
