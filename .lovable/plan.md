You're now SSH'd into your Hetzner VPS (the prompt `root@ir-show:~#` confirms it). Next steps to run **in that same terminal window**:

## Step 1 — Check if the project code is already on the VPS

```bash
ls /var/www/ir-show
```

**If it shows files** (package.json, scripts/, etc.) → skip to Step 3.

**If it says "No such file or directory"** → do Step 2 first.

## Step 2 — Clone the project onto the VPS (only if Step 1 was empty)

```bash
apt update && apt install -y git
mkdir -p /var/www
cd /var/www
git clone <YOUR_GIT_REPO_URL> ir-show
```

Replace `<YOUR_GIT_REPO_URL>` with your GitHub repo URL (the one connected to Lovable). I need you to tell me the repo URL if you don't know it — check GitHub.

## Step 3 — Run the provisioning script

```bash
cd /var/www/ir-show
chmod +x scripts/provision-iran-mirror.sh
MIRROR_DOMAIN=ir.show \
API_DOMAIN=api.ir.show \
ACME_EMAIL=you@youremail.com \
./scripts/provision-iran-mirror.sh
```

Replace `you@youremail.com` with your real email (used by Let's Encrypt for SSL cert notifications).

## Step 4 — Report back

Paste the **last ~20 lines** of output so I can verify nginx, SSL, and the mirror are all healthy.

---

**First, just run Step 1 and tell me what you see.**
