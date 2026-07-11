alter table public.films add column if not exists "language" text default 'fa';
update public.films set "language" = 'fa' where "language" is null;