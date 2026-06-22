# Iran Mirror — Setup Guide

The main site (`ir.show` on Cloudflare Workers) and the Supabase backend
(`*.supabase.co`) are both blocked from inside Iran. This guide stands up a
single Hetzner VM that reverse-proxies both, so visitors in Iran can reach
the app without a VPN — and the very first byte is already in Persian / RTL /
Toman, no flash of English.

The proxy is **not** an attempt to bypass Stripe/PayPal sanctions — payments
in IR mode go through an Iranian gateway (ZarinPal / IDPay / NextPay), and
Stripe/PayPal buttons are hidden for IR visitors.

## How region detection works (end to end)

When a request reaches Lovable's SSR, `src/lib/region.server.ts` resolves the
region in this priority order, and the result is rendered into
`<html lang dir data-region>` on the first byte:

1. **`iran_region` cookie** — explicit user choice (region switcher), wins forever.
2. **`X-Iran-Mirror` header** — set by Caddy on every mirror request → Iran.
3. **`X-Forwarded-Host` / `Host`** matching `ir.show`, `www.ir.show`, `m.ir.show` → Iran.
4. **`cf-ipcountry` / `x-vercel-ip-country` / `X-Country-Code`** — for direct
   hits on `claude-clone-creation.lovable.app` from inside Iran (no mirror).
5. **Nothing detected** → Global default + region switcher visible.

When the resolver decides on a region (cases 2-4), it also writes the
`iran_region` cookie so subsequent visits hit case 1 instantly.

---

## 1. What you'll end up with

| Hostname | Purpose | Points to |
| --- | --- | --- |
| `ir.show` | The site for IR visitors | Hetzner VM → published Lovable URL |
| `api.ir.show` | Supabase REST / Auth / Storage / Realtime | Hetzner VM → `yasfnvftzwyuxdhpysof.supabase.co` |

You keep the published Lovable URL untouched for the rest of the world; IR
visitors hitting it directly are still detected via `cf-ipcountry`.

---

## 3. DNS records

At your DNS provider for `ir.show` (NOT proxied through Cloudflare for these
two — set the orange cloud to grey, or these subdomains will go through
Cloudflare and inherit the IR block):

```
A    m.ir.show     49.12.x.x      TTL 300   (Cloudflare proxy: OFF)
A    api.ir.show   49.12.x.x      TTL 300   (Cloudflare proxy: OFF)
```

Wait 1–2 minutes, then verify from your laptop:

```bash
dig +short m.ir.show
dig +short api.ir.show
```

Both should return `49.12.x.x`.

---

## 4. Install + configure Caddy (one command)

The repo ships `scripts/provision-iran-mirror.sh` which does everything in
sections 4 and 5 in one shot: installs Caddy, builds it with the
`replace-response` module, writes the Caddyfile, opens firewall ports,
restarts the service, and waits for Let's Encrypt certs.

SSH to the VM as root, then:

```bash
curl -fsSL https://raw.githubusercontent.com/<your-org>/<your-repo>/main/scripts/provision-iran-mirror.sh \
  | MIRROR_DOMAIN=m.ir.show \
    API_DOMAIN=api.ir.show \
    LOVABLE_URL=claude-clone-creation.lovable.app \
    SUPABASE_HOST=yasfnvftzwyuxdhpysof.supabase.co \
    ACME_EMAIL=you@ir.show \
    bash
```

Or copy the file over and run it locally:

```bash
scp scripts/provision-iran-mirror.sh root@VM_IP:/root/
ssh root@VM_IP 'chmod +x provision-iran-mirror.sh && ./provision-iran-mirror.sh'
```

All env vars have sensible defaults — you can run the script with no overrides.
It is idempotent, so re-running is safe (e.g. after editing the Caddyfile
template inside the script). When it finishes, skip to section 6.

<details><summary>Manual install (if you prefer)</summary>

```bash
apt update && apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
systemctl enable --now caddy
```
</details>

---

## 5. Caddy configuration

Replace `/etc/caddy/Caddyfile` with the contents below (paste the whole
block). Caddy fetches Let's Encrypt certs automatically on first request.

```caddyfile
# /etc/caddy/Caddyfile

{
    # Sensible defaults
    email you@ir.show
    servers {
        timeouts {
            read_body 30s
            read_header 10s
            write 60s
            idle 5m
        }
    }
}

# ---------- Site proxy: m.ir.show -> Lovable published site ----------
m.ir.show {
    encode zstd gzip

    # Rewrite the Supabase host inside HTML and JS bundles on the fly,
    # so the browser talks to api.ir.show instead of *.supabase.co.
    # This is the whole point of the proxy — no client-side code change needed.
    handle {
        reverse_proxy https://claude-clone-creation.lovable.app {
            header_up Host claude-clone-creation.lovable.app
            header_up X-Forwarded-Host {host}
            header_up X-Real-IP {remote_host}

            # Strip upstream's content-encoding so we can rewrite the body
            header_down -Content-Length
        }

        # Replace Supabase host references in the response body.
        # Requires the `replace-response` Caddy module — install with:
        #   caddy add-package github.com/caddyserver/replace-response
        # Then `systemctl restart caddy`.
        replace {
            stream
            "yasfnvftzwyuxdhpysof.supabase.co" "api.ir.show"
        }
    }
}

# ---------- API proxy: api.ir.show -> Supabase ----------
api.ir.show {
    encode zstd gzip

    @websockets {
        header Connection *Upgrade*
        header Upgrade websocket
    }

    # Realtime (WebSockets)
    handle @websockets {
        reverse_proxy https://yasfnvftzwyuxdhpysof.supabase.co {
            header_up Host yasfnvftzwyuxdhpysof.supabase.co
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
    }

    # REST / Auth / Storage / Functions
    handle {
        reverse_proxy https://yasfnvftzwyuxdhpysof.supabase.co {
            header_up Host yasfnvftzwyuxdhpysof.supabase.co
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}

            # CORS: allow the mirror site to call this API
            header_down Access-Control-Allow-Origin "https://m.ir.show"
            header_down Access-Control-Allow-Credentials "true"
        }
    }
}
```

### Install the `replace-response` module and reload

```bash
caddy add-package github.com/caddyserver/replace-response
systemctl restart caddy
journalctl -u caddy -f   # watch the cert issuance, Ctrl-C when both domains say "certificate obtained"
```

---

## 6. One-time Supabase Auth config

In Lovable Cloud → Backend → Auth → URL Configuration, add to **Redirect
URLs** (don't remove the existing ones):

- `https://m.ir.show/**`
- `https://m.ir.show/auth/callback`
- `https://m.ir.show/reset-password`

This allows email magic links and OAuth callbacks to land on the mirror
hostname.

---

## 7. Test from inside Iran

Use your IPRoyal Iran proxy (this is actually the correct use of an Iran
residential proxy — verifying that an outside-hosted mirror is reachable
from inside Iran).

```bash
# From your laptop, via IPRoyal IR endpoint
curl -x http://USER:PASS@geo.iproyal.com:12321 -I https://m.ir.show
curl -x http://USER:PASS@geo.iproyal.com:12321 -I https://api.ir.show/auth/v1/health
```

Both should return `200 OK`. Open `https://m.ir.show` in a browser
configured to route through the IPRoyal endpoint and confirm:

- Site loads
- Sign-in works (magic link arrives, link returns to m.ir.show)
- Watching a free film plays

---

## 8. Iranian payment gateway

A stub lives at `src/lib/ir-payments.functions.ts` and the callback route at
`src/routes/api/public/ir-payments/callback.ts`. To go live with a real
gateway:

### Option A — ZarinPal (recommended, most common)

1. Register a merchant at <https://www.zarinpal.com>
2. Get your **Merchant ID** (UUID)
3. Add it as a secret named `ZARINPAL_MERCHANT_ID` in Lovable Cloud
4. In `src/lib/ir-payments.functions.ts`, replace the stub with the
   ZarinPal request body documented at
   <https://docs.zarinpal.com/paymentGateway/guide/paymentGateway.html>
5. Webhook callback URL to register with ZarinPal:
   `https://m.ir.show/api/public/ir-payments/callback`

### Option B — IDPay or NextPay

Same shape, different endpoint. The callback route is provider-agnostic;
only the create-checkout body and the signature verification differ.

---

## 9. Iranian SMS provider (for phone OTP sign-in)

Supabase Auth has built-in SMS hooks. To enable phone OTP for IR users:

1. Sign up at one of:
   - **Kavenegar** (<https://kavenegar.com>) — most popular, ~₽40/SMS
   - **Melipayamak**
   - **SMS.ir**
2. Get the API key + sender number
3. In Lovable Cloud → Backend → Auth → SMS Provider, configure with the
   "Custom (HTTP)" hook and paste the provider's endpoint + your API key
4. Test from `/auth` — enter phone, receive code, sign in

---

## 10. Maintenance

- **Renew certs:** automatic (Caddy)
- **Update Caddy:** `apt update && apt upgrade caddy && systemctl restart caddy`
- **Logs:** `journalctl -u caddy -f`
- **Restart:** `systemctl restart caddy`
- **Monitor uptime:** point UptimeRobot (free) at both
  `https://m.ir.show/healthz` (returns the site shell) and
  `https://api.ir.show/auth/v1/health` (returns `{"date":"..."}`)

If Iran starts blocking your Hetzner IP (rare but possible), Hetzner lets you
swap the public IP for €0.50 — keep DNS TTL low (300s).

---

## 11. What's NOT solved by the proxy

- **Stripe / PayPal:** their edges refuse IR cards regardless. IR visitors
  use the Iranian gateway via the in-app "Pay with Iranian bank card"
  button.
- **Google Fonts / reCAPTCHA:** if any are still loaded directly, they'll
  fail from IR. The site falls back to a system font stack when fonts fail.
- **YouTube embeds / Vimeo:** if you ever embed external video, those need
  their own proxy or replacement.
