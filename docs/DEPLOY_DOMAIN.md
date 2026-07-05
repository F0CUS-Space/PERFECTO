# Domain, GoDaddy DNS, nginx & Firebase

## Do you need a domain, or is Firebase enough?

**Adding your domain in Firebase Authorized domains is not enough by itself.**

| Step | What it does |
|------|----------------|
| **GoDaddy DNS** (A record → EC2 IP) | Makes `yourdomain.com` reach your server |
| **nginx + SSL** on EC2 | Serves the app on `https://yourdomain.com` (port 443) |
| **Firebase Authorized domains** | Allows phone OTP / reCAPTCHA on that domain |
| **`NEXT_PUBLIC_APP_URL`** | Tells the app its public URL (cookies, emails, Stripe redirects) |

You can open the app at `http://EC2_IP:3000` without a domain, but **Firebase phone OTP usually needs a real domain + HTTPS** in production. Raw IP addresses are not reliable for reCAPTCHA.

---

## Recommended architecture

```
User browser
    → yourdomain.com (GoDaddy DNS A record)
    → EC2 public IP :443
    → nginx (SSL termination)
    → localhost:3000 (Docker Next.js app)
```

---

## Step 1 — Elastic IP (recommended)

In **AWS EC2 → Elastic IPs**, allocate and associate an Elastic IP with your instance so the IP does not change when the instance reboots.

Use this IP everywhere below.

---

## Step 2 — GoDaddy DNS

In **GoDaddy → My Products → DNS** for your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `YOUR_EC2_PUBLIC_IP` | 600 (or default) |
| **A** | `www` | `YOUR_EC2_PUBLIC_IP` | 600 |

Remove conflicting records (old parking page, conflicting CNAME on `@`).

Wait 5–30 minutes, then verify:

```bash
dig +short yourdomain.com
# should print YOUR_EC2_PUBLIC_IP
```

---

## Step 3 — EC2 security group

Allow inbound:

| Port | Purpose |
|------|---------|
| 22 | SSH (deploy) |
| 80 | HTTP (Let's Encrypt + redirect) |
| 443 | HTTPS (production traffic) |
| 3000 | Optional — direct app access; can remove after nginx works |

---

## Step 4 — App running on port 3000

On EC2:

```bash
cd ~/PERFECTO
docker compose up -d
curl -I http://127.0.0.1:3000/
```

---

## Step 5 — Install nginx + SSL

On EC2 (after DNS propagates):

```bash
cd ~/PERFECTO
export PERFECTO_DOMAIN=yourdomain.com
export CERTBOT_EMAIL=you@yourdomain.com
bash scripts/ec2-nginx-setup.sh
```

This installs nginx, obtains a Let's Encrypt certificate, and proxies `https://yourdomain.com` → `localhost:3000`.

---

## Step 6 — Update server `.env` and rebuild

Edit `~/PERFECTO/.env`:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_AUTH_DEV_MODE=false
AUTH_DEV_MODE=false
```

Rebuild (required — `NEXT_PUBLIC_*` is embedded at build time):

```bash
cd ~/PERFECTO
docker compose up -d --build
```

---

## Step 7 — Firebase Console

1. **Authentication → Sign-in method → Phone** — Enabled  
2. **Authentication → Sign-in method → Email/Password** — Enabled (for email verification later)  
3. **Authentication → Settings → Authorized domains** — Add:
   - `yourdomain.com`
   - `www.yourdomain.com` (if you use www)
4. **Firestore** — rules for `notificationSignals/{uid}` (see main README / prior chat)

Do **not** change `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` — that stays your Firebase project domain (`perfecto-8033b.firebaseapp.com`).

---

## Step 8 — Stripe (if using payments)

Stripe Dashboard → Webhooks → endpoint:

```
https://yourdomain.com/api/webhooks/stripe
```

---

## Quick checklist

- [ ] Elastic IP associated with EC2  
- [ ] GoDaddy A records for `@` and `www`  
- [ ] Security group: 80, 443, 22  
- [ ] `docker compose up -d` works on EC2  
- [ ] `ec2-nginx-setup.sh` completed  
- [ ] `NEXT_PUBLIC_APP_URL=https://yourdomain.com` + rebuild  
- [ ] Domain added to Firebase Authorized domains  
- [ ] Phone auth tested at `https://yourdomain.com/register`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| certbot fails | DNS not propagated yet — wait and retry |
| Site loads but OTP fails | Domain missing from Firebase Authorized domains |
| Login works on IP but not domain | Rebuild after changing `NEXT_PUBLIC_APP_URL` |
| 502 Bad Gateway | App not running — `docker compose ps` |
| Cookie not set after login | `NEXT_PUBLIC_APP_URL` must be `https://` when using SSL |
