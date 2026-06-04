
CREATE TYPE public.coupon_discount_type AS ENUM ('percent', 'amount');
CREATE TYPE public.coupon_applies_to AS ENUM ('membership', 'ticket', 'all');

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text,
  discount_type public.coupon_discount_type NOT NULL,
  -- For percent: integer 1-100. For amount: smallest currency unit (cents/rial).
  discount_value integer NOT NULL CHECK (discount_value > 0),
  currency text, -- required when discount_type='amount', null for percent
  applies_to public.coupon_applies_to NOT NULL DEFAULT 'all',
  film_id uuid REFERENCES public.films(id) ON DELETE CASCADE, -- optional, restrict to one film
  max_redemptions integer, -- null = unlimited
  redemptions_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX coupons_code_unique ON public.coupons (lower(code));
CREATE INDEX coupons_active_idx ON public.coupons (active) WHERE active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Only admins can read/manage coupons via client. Validation/redemption happens
-- server-side via service_role (in server functions), bypassing RLS.
CREATE POLICY "Admins can view coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert coupons"
  ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update coupons"
  ON public.coupons FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete coupons"
  ON public.coupons FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER coupons_touch_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Redemption log: which user used which coupon for which checkout
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_session_id text,
  stripe_coupon_id text, -- the one-shot Stripe coupon created for this checkout
  context text NOT NULL, -- 'membership' | 'ticket'
  film_id uuid REFERENCES public.films(id) ON DELETE SET NULL,
  amount_off integer, -- recorded discount in smallest unit when known
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view redemptions"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own redemptions"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX coupon_redemptions_coupon_idx ON public.coupon_redemptions (coupon_id);
CREATE INDEX coupon_redemptions_user_idx ON public.coupon_redemptions (user_id);
