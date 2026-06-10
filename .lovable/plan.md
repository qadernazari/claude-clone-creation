Create `scripts/provision-iran-mirror.sh` — a single, self-contained bash script run via SSH on a fresh Hetzner VM that:

1. Installs Caddy from the official Cloudsmith repo (including apt key setup).
2. Writes `/etc/caddy/Caddyfile` from a heredoc embedded in the script, parameterized by environment variables at the top:
   - `MIRROR_DOMAIN` (default `m.ir.show`)
   - `API_DOMAIN` (default `api.ir.show`)
   - `LOVABLE_URL` (default `claude-clone-creation.lovable.app`)
   - `SUPABASE_HOST` (default `yasfnvftzwyuxdhpysof.supabase.co`)
   - `ACME_EMAIL` (default `you@ir.show`)
3. Installs the `replace-response` Caddy module.
4. Reloads Caddy (`systemctl restart caddy`) and tails the journal until "certificate obtained" appears for both domains (or times out after 120s).
5. Prints a confirmation message with next steps (DNS, Supabase Auth redirect URLs, testing).

The script is designed to be copy-pasted and run once as root. It will be documented in `docs/iran-mirror.md` with a one-liner `curl ... | bash` usage example.