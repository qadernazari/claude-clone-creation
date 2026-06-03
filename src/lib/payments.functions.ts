import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };

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

/**
 * Ensures a Stripe product + one-time USD price exists for the film,
 * keyed by film.slug as the price lookup_key. Returns the resolved Stripe price ID.
 */
async function ensureFilmPrice(
  stripe: ReturnType<typeof createStripeClient>,
  film: { id: string; slug: string; title_en: string; price_cents: number },
): Promise<{ priceId: string; productName: string }> {
  const lookupKey = `film_${film.slug}`;
  const productName = film.title_en;

  // Look up existing price by lookup_key.
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data.length) {
    const price = existing.data[0];
    if (price.unit_amount === film.price_cents) {
      return { priceId: price.id, productName };
    }
    // Price changed: deactivate old, create a new one with the same lookup_key.
    await stripe.prices.update(price.id, { active: false, lookup_key: null });
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const newPrice = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: film.price_cents,
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      nickname: productName,
      metadata: { film_id: film.id, film_slug: film.slug },
    });
    return { priceId: newPrice.id, productName };
  }

  // Create product + price fresh.
  const product = await stripe.products.create({
    name: productName,
    metadata: { film_id: film.id, film_slug: film.slug },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: film.price_cents,
    lookup_key: lookupKey,
    nickname: productName,
    metadata: { film_id: film.id, film_slug: film.slug },
  });
  return { priceId: price.id, productName };
}

export const createFilmCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filmSlug: string; returnUrl: string; environment: StripeEnv }) =>
    z.object({
      filmSlug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
    }).parse(data),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId, claims } = context;
      const email = (claims as { email?: string })?.email;

      const { data: film, error } = await supabase
        .from("films")
        .select("id, slug, title_en, price_cents, ticket_hours, visibility")
        .eq("slug", data.filmSlug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!film || film.visibility !== "published") throw new Error("Film not available");
      if (!film.price_cents || film.price_cents < 50) throw new Error("Price not configured");

      const stripe = createStripeClient(data.environment);
      const { priceId, productName } = await ensureFilmPrice(stripe, film);
      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: {
          description: productName,
          metadata: {
            userId,
            film_id: film.id,
            film_slug: film.slug,
            ticket_hours: String(film.ticket_hours ?? 48),
          },
        },
        metadata: {
          userId,
          film_id: film.id,
          film_slug: film.slug,
          ticket_hours: String(film.ticket_hours ?? 48),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
