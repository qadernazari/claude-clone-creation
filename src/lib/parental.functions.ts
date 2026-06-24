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
  // Legacy plaintext fallback for any rows backfilled before re-hashing.
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
 * sending the PIN value to the client.
 */
export const getParentalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ hasPin: boolean; maxAgeRating: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profileRes, credRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("max_age_rating")
        .eq("id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("parental_credentials" as never)
        .select("pin_hash")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    if (profileRes.error) throw new Error(profileRes.error.message);
    if (credRes.error) throw new Error(credRes.error.message);
    const cred = credRes.data as { pin_hash: string | null } | null;
    return {
      hasPin: !!(cred?.pin_hash && cred.pin_hash.length > 0),
      maxAgeRating: (profileRes.data?.max_age_rating as string | null) ?? null,
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
      .from("parental_credentials" as never)
      .select("pin_hash")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const stored = ((row as { pin_hash: string | null } | null)?.pin_hash) ?? null;
    if (!stored) return { ok: false };
    const ok = verifyPin(data.pin, stored);
    // Opportunistically upgrade legacy plaintext PINs to hashed form on a successful match.
    if (ok && /^[0-9]{4,6}$/.test(stored)) {
      await supabaseAdmin
        .from("parental_credentials" as never)
        .update({ pin_hash: hashPin(data.pin) } as never)
        .eq("user_id", context.userId);
    }
    return { ok };
  });

/**
 * Update parental settings (PIN + max age rating). The PIN is hashed before
 * being persisted; the plaintext PIN never leaves this handler.
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

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ max_age_rating: data.maxAgeRating })
      .eq("id", context.userId);
    if (profileErr) throw new Error(profileErr.message);

    if (data.clearPin) {
      const { error } = await supabaseAdmin
        .from("parental_credentials" as never)
        .delete()
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else if (data.pin) {
      const pin_hash = hashPin(data.pin);
      const { error } = await supabaseAdmin
        .from("parental_credentials" as never)
        .upsert({ user_id: context.userId, pin_hash } as never, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });
