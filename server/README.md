# exam-helper-server

Express backend for exam-helper. Handles authentication (email/password +
Google OAuth), session management, and user profiles via Better Auth,
backed by MongoDB Atlas. Separate from the Next.js frontend; deploys to
Coolify as a Docker container.

## Local development

1. Copy `.env.example` to `.env` and fill in real values.
2. Install deps: `npm install`.
3. Start dev server: `npm run dev`. Serves on port 4000.

Frontend `.env.local` should set:

```
NEXT_PUBLIC_AUTH_URL=http://localhost:4000
```

## Google OAuth setup

1. Go to https://console.cloud.google.com/apis/credentials.
2. Create OAuth 2.0 Client ID → Web application.
3. Authorized JavaScript origins: `http://localhost:4000`, `http://localhost:3000`, and your production URLs.
4. Authorized redirect URIs:
   - `http://localhost:4000/api/auth/callback/google`
   - `https://api.your-domain.com/api/auth/callback/google`
5. Copy Client ID + Client Secret into `.env`.

## Resend setup

1. Sign up at https://resend.com.
2. Create an API key (free tier: 100 emails/day).
3. For production: verify your domain to send from `noreply@your-domain.com`.
4. During dev, `RESEND_FROM_EMAIL=onboarding@resend.dev` works for test sends to any email.

## Deploying to Coolify

1. In Coolify: new Application → Dockerfile-based.
2. Repository: point at this repo; working directory: `server`.
3. Port: 4000 exposed.
4. Environment variables: copy all keys from `.env.example`, supply real values:
   - Set `BETTER_AUTH_URL` to `https://api.your-domain.com` (the Coolify-assigned domain with HTTPS).
   - Set `FRONTEND_URL` to your Vercel URL or custom domain.
   - Set `NODE_ENV=production`.
5. Coolify handles TLS via Let's Encrypt — make sure HTTPS is enabled on the domain.
6. Healthcheck: `GET /api/health` — Coolify is configured to use the Dockerfile's `HEALTHCHECK`.
7. Deploy. Check logs — expect `{"msg":"server listening","port":4000}`.

## Endpoints

- `GET /api/health` — liveness probe, returns `{ ok: true }`.
- `GET /api/me` — current user profile (401 if no session).
- `/api/auth/*` — Better Auth's mounted handlers (sign-up, sign-in, reset, verify, OAuth callbacks, etc.).
