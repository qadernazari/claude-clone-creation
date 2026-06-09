import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Iranian payment gateway — stub
// ---------------------------------------------------------------------------
// This file has the same shape as src/lib/membership.functions.ts and
// src/lib/payments.functions.ts (Stripe), but routes through an Iranian
// gateway (ZarinPal / IDPay / NextPay) so IR visitors can pay in Toman with
// an Iranian bank card.
//
// Until a gateway is wired up, both fns return { error } and the IR
// checkout UI shows "Coming soon". See docs/iran-mirror.md §8 for the
// 5-line swap to enable a real gateway.

export type IrCheckoutKind = "membership" | "ticket" | "contribution";

const inputSchema = z.object({
  kind: z.enum(["membership", "ticket", "contribution"]),
  itemId: z.string().min(1).max(120),
  amountToman: z.number().int().min(1000).max(500_000_000).optional(),
  couponCode: z.string().min(1).max(64).optional(),
});

export const createIrCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof inputSchema>) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<
    { redirectUrl: string } | { error: string }
  > => {
    const { userId } = context;
    const gateway = process.env.IR_PAYMENT_PROVIDER ?? "stub";

    if (gateway === "stub") {
      return {
        error:
          "Iranian payment gateway is not yet configured. See docs/iran-mirror.md §8 to enable ZarinPal/IDPay/NextPay.",
      };
    }

    // When you wire up a real gateway, replace this block with the
    // provider's "create payment request" call and return the gateway's
    // redirect URL. Persist the gateway's reference (Authority / order_id)
    // on a pending row in tickets/subscriptions/contributions so the
    // callback can verify + mark paid.
    void data;
    void userId;
    return { error: "Unsupported IR_PAYMENT_PROVIDER: " + gateway };
  });

// Re-exported for the callback handler to share validation.
export const irCheckoutSchema = inputSchema;
