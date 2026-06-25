import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { user: User | null; isLoading: boolean };

const AuthContext = createContext<AuthState>({ user: null, isLoading: true });

/**
 * Single source of truth for the current Supabase user.
 * One `getSession()` + one `onAuthStateChange` subscription per page —
 * previously every consumer of useCurrentUser/useSubscription created
 * its own pair, which on mobile cost ~5x duplicate work on first paint.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({ user: data.session?.user ?? null, isLoading: false });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setState({ user: s?.user ?? null, isLoading: false });
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthState(): AuthState {
  return useContext(AuthContext);
}
