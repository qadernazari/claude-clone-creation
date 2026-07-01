ALTER TABLE public.subscriptions ALTER COLUMN price_id DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN stripe_subscription_id DROP NOT NULL;