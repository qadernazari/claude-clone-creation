import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;

function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPin(pin: string, stored: string): boolean {
  // Legacy plaintext fallback: stored value is a 4-6 digit string.
  if (/^[0-9]{4,6}$/.test(stored)) {
    const a = Buffer.from(stored);
    const b = Buffer.from(pin);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  const actual = scryptSync(pin, salt, expected.length, { N: n, r: SCRYPT_R, p: SCRYPT_P });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Return whether the current user has a parental PIN set, without ever
 * sending the PIN value to the client. The PIN itself stays server-side.
 */
export const getParentalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ hasPin: boolean; maxAgeRating: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("parental_pin, max_age_rating")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      hasPin: !!(data?.parental_pin && (data.parental_pin as string).length > 0),
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("parental_pin")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const stored = (row?.parental_pin as string | null) ?? null;
    if (!stored) return { ok: false };
    return { ok: verifyPin(data.pin, stored) };
  });

/**
 * Update parental settings (PIN + max age rating) server-side. The PIN is
 * hashed before being persisted; the plaintext PIN never leaves this handler.
 */
export const setParentalSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { maxAgeRating: string | null; pin?: string | null; clearPin?: boolean }) =>
    z
      .object({
        maxAgeRating: z.string().trim().min(1).max(16).nullable(),
        pin: z
          .string()
          .trim()
          .regex(/^[0-9]{4,6}$/, "PIN must be 4–6 digits")
          .optional()
          .nullable(),
        clearPin: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { max_age_rating: string | null; parental_pin?: string | null } = {
      max_age_rating: data.maxAgeRating,
    };
    if (data.clearPin) patch.parental_pin = null;
    else if (data.pin) patch.parental_pin = hashPin(data.pin);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
