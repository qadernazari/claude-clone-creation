import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

export function AuthMenu() {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-cream/20 px-4 py-2 text-sm text-cream/90 hover:bg-cream/10 transition-colors"
      >
        {fa ? "ورود" : "Sign in"}
      </Link>
    );
  }

  const initial = (user.user_metadata?.full_name || user.email || "?")[0]?.toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-10 w-10 rounded-full bg-cream/10 text-cream text-sm font-medium hover:bg-cream/20 transition-colors"
        aria-label="Account menu"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-md border border-cream/15 bg-bg-1 p-1 shadow-lg z-50">
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
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block rounded-sm px-3 py-2 text-sm hover:bg-cream/10 transition-colors"
            >
              {fa ? "پنل مدیریت" : "Admin dashboard"}
            </Link>
          )}
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
