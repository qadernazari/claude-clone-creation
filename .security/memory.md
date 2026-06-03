# Security Memory

## App
Bilingual (EN/FA) film streaming + contributions platform on TanStack Start + Lovable Cloud. Stripe handles payments via server functions and a `/api/public/payments/webhook` route that uses service_role.

## Must never happen
- `films.video_url` exposed to anon/authenticated clients. It is column-revoked; only the `getFilmStreamUrl` server function (auth + verified paid ticket) returns it.
- Any client INSERT/UPDATE/DELETE on `contributions`, `tickets`, `user_roles`, `payment_events`. All writes happen via service_role from server code.
- Storing user roles on `profiles` or any user-owned table. Roles live only in `user_roles`, gated by `has_role(_user_id, _role)`.

## Scanner guidance — do not re-flag
- `public.has_role(uuid, app_role)` is SECURITY DEFINER with EXECUTE granted to anon and authenticated. This is **required**: it is referenced from RLS policies on films/contributions/user_roles/pages/site_content, and PostgreSQL requires the calling role to have EXECUTE for the policy to evaluate. Function only returns a boolean against `user_roles`. Do not flag as "Public/Signed-in users can execute SECURITY DEFINER function".
- `contact_submissions` has `FOR INSERT WITH CHECK (true)` so anonymous visitors can submit the public contact form. SELECT is admin-only. Do not flag this as "RLS policy always true".
- Public-read CMS tables with `FOR SELECT USING (true)` (`categories`, `film_credits`, `pages`, `site_content`) are intentional public content surfaces.
- `films` has `FOR SELECT USING (visibility = 'published' OR has_role(...))` — intentional. `video_url` is column-revoked separately.
