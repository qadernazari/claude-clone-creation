#!/usr/bin/env bash
# provision-iran-mirror.sh
#
# One-shot provisioner for the Iran mirror VM (see docs/iran-mirror.md).
# Run as root on a fresh Ubuntu 24.04 Hetzner VM:
#
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/scripts/provision-iran-mirror.sh \
#     | MIRROR_DOMAIN=m.ir.show API_DOMAIN=api.ir.show ACME_EMAIL=you@ir.show bash
#
# Or copy the file over and run:
#   chmod +x provision-iran-mirror.sh && ./provision-iran-mirror.sh
#
# Idempotent: safe to re-run.

set -euo pipefail

# ---------- Config (override via env vars) ----------
MIRROR_DOMAIN="${MIRROR_DOMAIN:-m.ir.show}"
API_DOMAIN="${API_DOMAIN:-api.ir.show}"
LOVABLE_URL="${LOVABLE_URL:-claude-clone-creation.lovable.app}"
SUPABASE_HOST="${SUPABASE_HOST:-yasfnvftzwyuxdhpysof.supabase.co}"
ACME_EMAIL="${ACME_EMAIL:-you@ir.show}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
err() { printf '\n\033[1;31m!! %s\033[0m\n' "$*" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "Must run as root (try: sudo bash $0)"
  exit 1
fi

log "Config:"
echo "    MIRROR_DOMAIN = $MIRROR_DOMAIN"
echo "    API_DOMAIN    = $API_DOMAIN"
echo "    LOVABLE_URL   = $LOVABLE_URL"
echo "    SUPABASE_HOST = $SUPABASE_HOST"
echo "    ACME_EMAIL    = $ACME_EMAIL"

# ---------- 1. Base packages ----------
log "Installing prerequisites"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg ca-certificates

# ---------- 2. Caddy repo + install ----------
if ! command -v caddy >/dev/null 2>&1; then
  log "Adding Caddy apt repo"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
else
  log "Caddy already installed: $(caddy version)"
fi

# ---------- 3. Build Caddy with replace-response module ----------
# The stock caddy package does NOT include replace-response. We use
# caddy's xcaddy build to produce a custom binary, then replace
# /usr/bin/caddy with it.
NEEDS_REPLACE=1
if caddy list-modules 2>/dev/null | grep -q 'http.handlers.replace_response'; then
  NEEDS_REPLACE=0
fi

if [[ $NEEDS_REPLACE -eq 1 ]]; then
  log "Building Caddy with replace-response module (via xcaddy)"
  if ! command -v go >/dev/null 2>&1; then
    apt-get install -y golang-go
  fi
  if ! command -v xcaddy >/dev/null 2>&1; then
    GOBIN=/usr/local/bin go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
  fi
  systemctl stop caddy || true
  xcaddy build \
    --with github.com/caddyserver/replace-response \
    --output /usr/bin/caddy
  setcap 'cap_net_bind_service=+ep' /usr/bin/caddy || true
else
  log "replace-response module already present"
fi

# ---------- 4. Write Caddyfile ----------
log "Writing /etc/caddy/Caddyfile"
mkdir -p /etc/caddy
cat > /etc/caddy/Caddyfile <<EOF
{
    email ${ACME_EMAIL}
    servers {
        timeouts {
            read_body 30s
            read_header 10s
            write 60s
            idle 5m
        }
    }
}

# ---------- Site proxy: ${MIRROR_DOMAIN} -> Lovable published site ----------
${MIRROR_DOMAIN} {
    encode zstd gzip

    reverse_proxy https://${LOVABLE_URL} {
        header_up Host ${LOVABLE_URL}
        header_up X-Forwarded-Host {host}
        header_up X-Real-IP {remote_host}
        header_down -Content-Length
    }

    replace {
        stream
        "${SUPABASE_HOST}" "${API_DOMAIN}"
    }
}

# ---------- API proxy: ${API_DOMAIN} -> Supabase ----------
${API_DOMAIN} {
    encode zstd gzip

    @websockets {
        header Connection *Upgrade*
        header Upgrade websocket
    }

    handle @websockets {
        reverse_proxy https://${SUPABASE_HOST} {
            header_up Host ${SUPABASE_HOST}
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
    }

    handle {
        reverse_proxy https://${SUPABASE_HOST} {
            header_up Host ${SUPABASE_HOST}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}

            header_down Access-Control-Allow-Origin "https://${MIRROR_DOMAIN}"
            header_down Access-Control-Allow-Credentials "true"
        }
    }
}
EOF

log "Validating Caddyfile"
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# ---------- 5. Open firewall (if ufw active) ----------
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  log "Opening ports 80/443 in ufw"
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
fi

# ---------- 6. Restart Caddy ----------
log "Restarting Caddy"
systemctl enable caddy
systemctl restart caddy
sleep 2
systemctl --no-pager status caddy | head -n 15 || true

# ---------- 7. Wait for cert issuance ----------
log "Waiting up to 120s for TLS certificates (${MIRROR_DOMAIN}, ${API_DOMAIN})"
DEADLINE=$(( $(date +%s) + 120 ))
MIRROR_OK=0
API_OK=0
while [[ $(date +%s) -lt $DEADLINE ]]; do
  if [[ $MIRROR_OK -eq 0 ]] && curl -sfI --max-time 5 "https://${MIRROR_DOMAIN}" >/dev/null 2>&1; then
    MIRROR_OK=1; log "${MIRROR_DOMAIN} is serving HTTPS"
  fi
  if [[ $API_OK -eq 0 ]] && curl -sfI --max-time 5 "https://${API_DOMAIN}/auth/v1/health" >/dev/null 2>&1; then
    API_OK=1; log "${API_DOMAIN} is serving HTTPS"
  fi
  [[ $MIRROR_OK -eq 1 && $API_OK -eq 1 ]] && break
  sleep 4
done

# ---------- 8. Summary ----------
echo
echo "============================================================"
echo " Iran mirror provisioning complete"
echo "============================================================"
echo " Site : https://${MIRROR_DOMAIN}    [$( [[ $MIRROR_OK -eq 1 ]] && echo OK || echo PENDING )]"
echo " API  : https://${API_DOMAIN}       [$( [[ $API_OK    -eq 1 ]] && echo OK || echo PENDING )]"
echo
echo " Next steps:"
echo "   1. Confirm DNS A records for both hostnames point to this VM"
echo "      (Cloudflare proxy OFF — grey cloud)."
echo "   2. In Lovable Cloud -> Auth -> URL Configuration, add:"
echo "        https://${MIRROR_DOMAIN}/**"
echo "        https://${MIRROR_DOMAIN}/auth/callback"
echo "        https://${MIRROR_DOMAIN}/reset-password"
echo "   3. Test from inside Iran via an IR residential proxy:"
echo "        curl -x http://USER:PASS@geo.iproyal.com:12321 -I https://${MIRROR_DOMAIN}"
echo
echo " Logs: journalctl -u caddy -f"
echo "============================================================"
