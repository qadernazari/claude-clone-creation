
-- Restrict storage SELECT to admins. Public access continues to use signed URLs (which bypass RLS).
DROP POLICY IF EXISTS "read_film-covers" ON storage.objects;
DROP POLICY IF EXISTS "read_film-thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "read_film-trailers" ON storage.objects;
DROP POLICY IF EXISTS "read_film-videos" ON storage.objects;

CREATE POLICY "read_film-covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'film-covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "read_film-thumbnails" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'film-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "read_film-trailers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'film-trailers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "read_film-videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'film-videos' AND public.has_role(auth.uid(), 'admin'));

-- Remove subscriptions table from realtime publication; app does not use realtime for it.
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;
