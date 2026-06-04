
DO $$
DECLARE b TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['film-covers','film-thumbnails','film-trailers','film-videos']
  LOOP
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = %L);
    $f$, 'read_' || b, b);

    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %L AND public.has_role(auth.uid(), 'admin'::app_role));
    $f$, 'insert_' || b, b);

    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = %L AND public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (bucket_id = %L AND public.has_role(auth.uid(), 'admin'::app_role));
    $f$, 'update_' || b, b, b);

    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = %L AND public.has_role(auth.uid(), 'admin'::app_role));
    $f$, 'delete_' || b, b);
  END LOOP;
END$$;
