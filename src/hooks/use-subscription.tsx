import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type FilmAccessType = Database["public"]["Enums"]["film_access_type"];

export type SubscriptionRow = {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  price_id: string;
  environment: string;
};

function isActive(sub: SubscriptionRow | null | undefined): boolean {
  if (!sub) return false;
  const futureEnd = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
  if (["active", "trialing", "past_due"].includes(sub.status) && futureEnd) return true;
  if (sub.status === "canceled" && futureEnd) return true;
  return false;
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  return user;
}

export function useSubscription() {
  const user = useCurrentUser();
  let env: string | null = null;
  try {
    env = getStripeEnvironment();
  } catch {
    env = null;
  }
  const query = useQuery({
    queryKey: ["subscription", user?.id ?? "anon", env],
    enabled: !!user && !!env,
    queryFn: async (): Promise<SubscriptionRow | null> => {
      if (!user || !env) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, status, current_period_end, cancel_at_period_end, trial_end, price_id, environment")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as SubscriptionRow | null;
    },
    staleTime: 30_000,
  });

  return {
    user,
    subscription: query.data ?? null,
    isMember: isActive(query.data ?? null),
    isLoading: query.isLoading,
  };
}

/** True if the film is watchable for a member without any extra purchase. */
export function memberCanAccess(accessType: FilmAccessType): boolean {
  return accessType === "membership" || accessType === "membership_or_ppv" || accessType === "free";
}

/** True if PPV purchase is offered (for non-members or premium films). */
export function ppvAvailable(accessType: FilmAccessType): boolean {
  return accessType === "ppv_only" || accessType === "membership_or_ppv";
}
