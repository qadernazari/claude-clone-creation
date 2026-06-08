import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Return whether the current user has a parental PIN set, without ever
 * sending the PIN value to the client. The PIN itself stays server-side.
 */
export const getParentalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ hasPin: boolean; maxAgeRating: string | null }> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("parental_pin, max_age_rating")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      hasPin: !!(data?.parental_pin && data.parental_pin.length > 0),
      maxAgeRating: (data?.max_age_rating as string | null) ?? null,
    };
  });

/**
 * Verify a candidate PIN server-side. Never returns the stored PIN.
 */
export const verifyParentalPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { pin: string }) =>
    z.object({ pin: z.string().trim().regex(/^[0-9]{4,6}$/, "PIN must be 4–6 digits") }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .select("parental_pin")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const stored = (row?.parental_pin as string | null) ?? null;
    if (!stored) return { ok: false };
    return { ok: stored === data.pin };
  });
