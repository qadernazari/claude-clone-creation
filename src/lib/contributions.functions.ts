import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type Result = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createContributionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    amountCents: number;
    filmSlug?: string;
    returnUrl: string;
    environment: StripeEnv;
  }) =>
    z.object({
      amountCents: z.number().int().min(100).max(1_000_000),
      filmSlug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
    }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Result> => {
    try {
      const { supabase, userId, claims } = context;
      const email = (claims as { email?: string })?.email;

      let filmId: string | null = null;
      let label = "Contribution to IRAN";
      if (data.filmSlug) {
        const { data: film, error } = await supabase
          .from("films")
          .select("id, title_en, visibility")
          .eq("slug", data.filmSlug)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!film || film.visibility !== "published") throw new Error("Film not available");
        filmId = film.id;
        label = `Contribution — ${film.title_en}`;
      }

      const stripe = createStripeClient(data.environment);
      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: label },
              unit_amount: data.amountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: {
          description: label,
          metadata: {
            type: "contribution",
            userId,
            ...(filmId && { film_id: filmId }),
            ...(data.filmSlug && { film_slug: data.filmSlug }),
          },
        },
        metadata: {
          type: "contribution",
          userId,
          ...(filmId && { film_id: filmId }),
          ...(data.filmSlug && { film_slug: data.filmSlug }),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
