
-- Pin search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke execute on SECURITY DEFINER helpers from public roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- has_role is still usable inside RLS policies (runs as definer)

-- Tighten public-insert policies (replace USING (true) with shape checks)
DROP POLICY "Anyone can subscribe" ON public.notify_list;
CREATE POLICY "Anyone can subscribe" ON public.notify_list
  FOR INSERT TO anon, authenticated
  WITH CHECK (email_lower IS NOT NULL AND email_lower ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

DROP POLICY "Anyone can log events" ON public.events;
CREATE POLICY "Anyone can log events" ON public.events
  FOR INSERT TO anon, authenticated
  WITH CHECK (type IN ('view', 'progress', 'complete'));
