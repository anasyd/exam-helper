# Deployment Guide

Frontend is hosted on **Vercel** at `yourdomain.com`.  
Backend is hosted on **Coolify** (your own server) at `api.yourdomain.com`.

No Docker Compose needed — Coolify manages the container from the `server/Dockerfile` directly.

---

## 1. Generate secrets (do this first)

On your local machine, generate a secure auth secret:

```bash
openssl rand -base64 32
```

Copy the output. You'll use it as `BETTER_AUTH_SECRET`.

---

## 2. Google OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Under **Authorized redirect URIs**, add:
   ```
   https://api.yourdomain.com/api/auth/callback/google
   ```
5. Click **Create** — copy the **Client ID** and **Client Secret**

---

## 3. Resend (transactional email)

1. Go to [resend.com](https://resend.com) and create an account
2. Add and verify your domain (e.g. `yourdomain.com`) in **Domains**
3. Go to **API Keys** → **Create API Key** — copy it (starts with `re_`)
4. Your from-address can be anything at the verified domain, e.g. `noreply@yourdomain.com`

---

## 4. Coolify — Deploy the backend

### 4a. Point the domain

In your DNS provider, add an **A record**:
- Name: `api`
- Value: your Coolify server IP

Then in Coolify, add `api.yourdomain.com` as the domain for this service (Coolify handles the SSL cert automatically via Let's Encrypt).

### 4b. Create the service

1. In Coolify → **New Resource** → **Docker** (not Docker Compose)
2. Connect your GitHub repo (`your-username/exam-helper`)
3. Set **Build Path** / **Dockerfile location** to `server/Dockerfile`
4. Set **Base Directory** to `server/`

### 4c. Set environment variables

Add each of these in Coolify's **Environment Variables** tab:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0` |
| `BETTER_AUTH_SECRET` | *(the value from step 1)* |
| `BETTER_AUTH_URL` | `https://api.yourdomain.com` |
| `FRONTEND_URL` | `https://yourdomain.com` |
| `GOOGLE_CLIENT_ID` | *(from step 2)* |
| `GOOGLE_CLIENT_SECRET` | *(from step 2)* |
| `RESEND_API_KEY` | *(from step 3, starts with `re_`)* |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` |

> `PORT` is intentionally omitted — Coolify injects it automatically, and the Dockerfile defaults to `4000`.

### 4d. Deploy and verify

1. Click **Deploy**
2. Watch the build logs — it compiles TypeScript then starts the server
3. Once live, open: `https://api.yourdomain.com/api/health`
4. You should see: `{"ok":true}`

If you see an error instead, check **Logs** in Coolify — the most common causes are a missing env var or MongoDB Atlas not allowing the Coolify server IP.

### 4e. MongoDB Atlas IP allowlist

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → your cluster → **Network Access**
2. Click **Add IP Address**
3. Add your Coolify server's IP address (or `0.0.0.0/0` to allow all — fine for dev, not ideal for prod)

---

## 5. Vercel — Update the frontend

### 5a. Set the Root Directory

The Next.js app now lives in `web/`. Vercel needs to know this:

1. Go to [vercel.com](https://vercel.com) → your `exam-helper` project → **Settings** → **General**
2. Under **Root Directory**, click **Edit** and set it to `web`
3. Save

### 5b. Set environment variables

1. Go to **Settings** → **Environment Variables**
2. Add:

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_AUTH_URL` | `https://api.yourdomain.com` | Production, Preview |

### 5c. Redeploy

Go to **Deployments** → click `...` on the latest deployment → **Redeploy**.

---

## 6. End-to-end smoke test

Run through this checklist after both services are live:

- [ ] `https://api.yourdomain.com/api/health` returns `{"ok":true}`
- [ ] Go to `https://yourdomain.com/sign-up` — create an account with email + password
- [ ] Check your inbox — you should receive a verification email from `noreply@yourdomain.com`
- [ ] Click the verification link — you should land on `/app` with the banner gone
- [ ] Sign out, then sign back in at `/sign-in`
- [ ] Go to `/sign-in` → click **Continue with Google** → Google consent screen opens → redirected to `/app`
- [ ] Go to `/forgot-password` → enter your email → reset email arrives → set new password → sign in

---

## Troubleshooting

**`/api/health` returns 503**  
→ The backend started but can't reach MongoDB. Check the Atlas IP allowlist (step 4e).

**Sign-in redirects to Google but fails with `redirect_uri_mismatch`**  
→ The redirect URI in Google Cloud Console doesn't match. Make sure it is exactly:  
`https://api.yourdomain.com/api/auth/callback/google`

**"Auth features will not work" warning in browser console**  
→ `NEXT_PUBLIC_AUTH_URL` is missing or not yet applied. Redeploy Vercel after adding the variable.

**Emails not arriving**  
→ Check that your Resend domain is verified (green checkmark in Resend dashboard). Also check spam.

**Coolify build fails with "Invalid env"**  
→ One or more environment variables is missing or wrong format. The server logs will print exactly which field failed.
