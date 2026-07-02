UPDATE public.subscriptions
SET current_period_end = (current_period_start::timestamptz + INTERVAL '3 months')
WHERE ir_gateway = 'zarinpal'
  AND status = 'active'
  AND amount_toman = 199000
  AND ROUND(EXTRACT(EPOCH FROM (current_period_end - current_period_start)) / 86400 / 30) = 2;