## Next steps — point your VPS at the published Lovable site

Great — the repo is on the VM. You don't need to "build the app" on the VPS. The plan all along is to use this VM as a **reverse proxy / mirror** that forwards traffic to the already-published Lovable site (`claude-clone-creation.lovable.app`) and to Supabase. The provisioning script you just cloned does the whole setup.

Here's what's left, in order:

### 1. Pick your mirror domains
You need two subdomains under a domain you own (the docs assume `ir.show`, but use whatever domain you have):
- `m.<yourdomain>` → the site for Iran visitors
- `api.<yourdomain>` → the Supabase proxy

If you don't own a domain yet, register one first (Namecheap, Cloudflare Registrar, etc.).

### 2. Create two DNS A records
Both point to your VPS IP (`178.105.249.220` based on the SSH prompt). Important: if the domain is on Cloudflare, set the proxy (orange cloud) to **OFF / DNS only** for these two records — otherwise Cloudflare will be in the path and the IR block applies.

```
A   m.<yourdomain>     178.105.249.220   TTL 300   proxy OFF
A   api.<yourdomain>   178.105.249.220   TTL 300   proxy OFF
```

Verify from your laptop:
```bash
dig +short m.<yourdomain>
dig +short api.<yourdomain>
```
Both should print `178.105.249.220`.

### 3. Run the provisioning script on the VM
Back in your SSH terminal on the VM:

```bash
cd /var/www/ir-show && \
chmod +x scripts/provision-iran-mirror.sh && \
MIRROR_DOMAIN=m.<yourdomain> \
API_DOMAIN=api.<yourdomain> \
LOVABLE_URL=claude-clone-creation.lovable.app \
SUPABASE_HOST=yasfnvftzwyuxdhpysof.supabase.co \
ACME_EMAIL=you@<yourdomain> \
./scripts/provision-iran-mirror.sh
```

This installs Caddy, builds in the `replace-response` module, writes the Caddyfile, opens firewall ports 80/443, and fetches Let's Encrypt certs for both domains. It's idempotent — safe to re-run if anything fails.

### 4. Add the mirror URLs to Supabase Auth
In Lovable Cloud → Backend → Auth → URL Configuration, **add** (don't replace) to Redirect URLs:
- `https://m.<yourdomain>/**`
- `https://m.<yourdomain>/auth/callback`
- `https://m.<yourdomain>/reset-password`

This makes magic links and OAuth callbacks return to the mirror hostname instead of the Lovable one.

### 5. Test
From your laptop:
```bash
curl -I https://m.<yourdomain>
curl -I https://api.<yourdomain>/auth/v1/health
```
Both should return `200 OK`. Then open `https://m.<yourdomain>` in a browser to confirm the site loads and sign-in works.

To verify it actually works from inside Iran, route through an Iran residential proxy (e.g. IPRoyal) — full instructions are in `docs/iran-mirror.md` section 7.

---

### What I need from you to proceed
1. **What domain do you own?** (so I can give you the exact commands with real subdomain names instead of `<yourdomain>`)
2. Confirm the VPS IP is `178.105.249.220` (that's what the SSH prompt showed).

Once you tell me the domain, I'll hand you the copy-paste DNS records and the exact provisioning command for your terminal.