CREATE TABLE IF NOT EXISTS public.ir_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authority text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('membership', 'ticket', 'contribution')),
  item_id text NOT NULL,
  amount_toman integer NOT NULL,
  coupon_code text,
  ref_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, SELECT ON public.ir_payment_requests TO authenticated;
GRANT ALL ON public.ir_payment_requests TO service_role;

ALTER TABLE public.ir_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own IR payment requests"
  ON public.ir_payment_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER touch_ir_payment_requests_updated_at
  BEFORE UPDATE ON public.ir_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS ir_gateway text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount_toman integer;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS ref_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS authority text;