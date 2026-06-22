## Plan: Run the Iran mirror on `ir.show` (root domain)

Your current DNS already has `@` and `www` pointing to the Iran VPS (`178.105.249.220`), so the root is ready. We just need to add the API subdomain and run the provisioning script with overridden domain variables.

### Step 1 — Add ONE DNS record at Namecheap

In the same DNS panel from your screenshot, click **ADD NEW RECORD**:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `api` | `178.105.249.220` | Automatic |

Leave all existing records alone (`@`, `www`, NS, TXT — keep them).

Verify once added:
```bash
dig +short ir.show
dig +short api.ir.show
```
Both must return `178.105.249.220`.

### Step 2 — Run the provisioning script with `ir.show` as the mirror

The script defaults to `m.ir.show`, so we override `MIRROR_DOMAIN` to the bare root. SSH into the VPS and run:

```bash
cd /var/www/ir-show
chmod +x scripts/provision-iran-mirror.sh
MIRROR_DOMAIN=ir.show \
API_DOMAIN=api.ir.show \
ACME_EMAIL=you@ir.show \
./scripts/provision-iran-mirror.sh
```

(Replace `you@ir.show` with a real email — Let's Encrypt uses it for cert expiry notices.)

The script will:
- Install Caddy + build with `replace-response` module
- Write `/etc/caddy/Caddyfile` configured for `ir.show` + `api.ir.show`
- Open ports 80/443 in ufw
- Fetch SSL certs from Let's Encrypt (~30-90s)
- Print an OK/PENDING summary at the end

### Step 3 — Add redirect URLs in Lovable Cloud Auth

Backend → Auth → URL Configuration → add to **Redirect URLs**:
```
https://ir.show/**
https://ir.show/auth/callback
https://ir.show/reset-password
```

### Step 4 — Verify from your laptop

```bash
curl -I https://ir.show
curl -I https://api.ir.show/auth/v1/health
```

Both should return `HTTP/2 200`.

### Notes

- `www.ir.show` will also resolve to the VPS but Caddy isn't configured for it. If you want `www` to work too, we can either (a) add it to the Caddyfile as a redirect to `ir.show`, or (b) just delete the `www` A record. Tell me which after Step 2 succeeds.
- Root domain has no Cloudflare proxy here — direct A record to VPS, which is what we need for SSL issuance.
