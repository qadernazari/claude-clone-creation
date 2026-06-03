
-- ============================================================
-- IRAN — Phase 1 schema
-- ============================================================

-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  locale text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'active', -- active|banned
  signup_ip text,
  signup_country text,
  signup_city text,
  last_active_at timestamptz,
  last_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, locale)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'locale', 'en')
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reusable updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Categories (bilingual)
CREATE TABLE public.categories (
  id text PRIMARY KEY,
  name_en text NOT NULL,
  name_fa text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Films
CREATE TABLE public.films (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_fa text,
  synopsis_en text,
  synopsis_fa text,
  director_en text,
  director_fa text,
  category text REFERENCES public.categories(id) ON DELETE SET NULL,
  year int,
  duration_min int,
  price_cents int NOT NULL DEFAULT 499,
  price_toman bigint NOT NULL DEFAULT 0,
  ticket_hours int NOT NULL DEFAULT 48,
  access_mode text NOT NULL DEFAULT 'inherit', -- inherit|free|paid
  poster_gradient text,
  cover_url text,
  video_url text,
  preview_url text,
  visibility text NOT NULL DEFAULT 'published', -- published|unlisted|draft
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX films_visibility_idx ON public.films (visibility);
GRANT SELECT ON public.films TO anon, authenticated;
GRANT ALL ON public.films TO service_role;
ALTER TABLE public.films ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published films" ON public.films FOR SELECT TO anon, authenticated
  USING (visibility = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write films" ON public.films FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER films_touch BEFORE UPDATE ON public.films
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Film credits
CREATE TABLE public.film_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  film_id uuid NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  credit_type text NOT NULL, -- cast|producer|writer|cinematographer|composer|editor|sound|custom
  label_en text,
  label_fa text,
  value_en text,
  value_fa text,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX film_credits_film_idx ON public.film_credits (film_id);
GRANT SELECT ON public.film_credits TO anon, authenticated;
GRANT ALL ON public.film_credits TO service_role;
ALTER TABLE public.film_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads film credits" ON public.film_credits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write film credits" ON public.film_credits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Tickets
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  film_id uuid NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending|paid|expired|refunded
  amount bigint NOT NULL,
  currency text NOT NULL DEFAULT 'usd', -- usd|toman
  provider text, -- stripe|paypal|zarinpal
  provider_ref text,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tickets_user_idx ON public.tickets (user_id);
CREATE INDEX tickets_film_idx ON public.tickets (film_id);
CREATE UNIQUE INDEX tickets_provider_ref_uniq ON public.tickets (provider_ref) WHERE provider_ref IS NOT NULL;
GRANT SELECT ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all tickets" ON public.tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage tickets" ON public.tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- INSERT/UPDATE from payments happens server-side via supabaseAdmin (bypasses RLS)

-- 7. Contributions (no-login)
CREATE TABLE public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  film_id uuid REFERENCES public.films(id) ON DELETE SET NULL,
  supporter text,
  amount bigint NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  provider text,
  provider_ref text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contributions_film_idx ON public.contributions (film_id);
CREATE UNIQUE INDEX contributions_provider_ref_uniq ON public.contributions (provider_ref) WHERE provider_ref IS NOT NULL;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read contributions" ON public.contributions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- Writes only via server functions using service_role

-- 8. Site content (admin-edited JSON blobs)
CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads site content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write site content" ON public.site_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER site_content_touch BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9. Notify list (anon insert)
CREATE TABLE public.notify_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_lower text NOT NULL UNIQUE,
  locale text DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.notify_list TO anon, authenticated;
GRANT ALL ON public.notify_list TO service_role;
ALTER TABLE public.notify_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.notify_list FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read notify list" ON public.notify_list FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Events (analytics; anon insert)
CREATE TABLE public.events (
  id bigserial PRIMARY KEY,
  film_id uuid REFERENCES public.films(id) ON DELETE CASCADE,
  type text NOT NULL,
  value int,
  country text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_film_idx ON public.events (film_id);
CREATE INDEX events_created_idx ON public.events (created_at);
GRANT INSERT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log events" ON public.events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read events" ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. Payment events (idempotency)
CREATE TABLE public.payment_events (
  id text PRIMARY KEY,
  provider text,
  type text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payment events" ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
