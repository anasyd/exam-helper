# Backend + Auth + MongoDB — Design

**Status:** approved (awaiting user spec review)
**Date:** 2026-04-22
**Sub-project:** 3 of 7 (revised roadmap; follows #6 landing page)
**Branch target:** `feat/backend-auth`

## Context

The exam-helper app has been pure client-side to date — Next.js on Vercel, projects persisted in browser `localStorage`, BYOK for AI providers. Sub-project #3 adds a **separate Express backend** deployed to the user's self-hosted Coolify instance, backed by **MongoDB Atlas**. The backend handles **user authentication only** in this sub-project — project data remains in localStorage until #4 migrates it.

User accounts unlock everything downstream: project sync across devices (#4), app polish for logged-in experience (#5), hosted-model billing (#7). Shipping auth now without a database migration or billing on top lets us validate the auth flow in isolation and keep the PR reviewable.

Per earlier brainstorming decisions: monorepo with `server/` subfolder, Better Auth library, email/password + Google OAuth, cookie-based sessions, soft email verification, anonymous use preserved.

## Goal

Ship a production-ready Express backend at `server/` with Better Auth, MongoDB Atlas, email/password + Google OAuth login, password reset, email verification, and a minimal frontend auth UI — while keeping anonymous use working for every existing flow.

## Roadmap Position

| # | Sub-project | Status |
|---|---|---|
| 1 | Package updates | shipped |
| 2 | Multi-provider AI + vision | shipped |
| 6 | Landing page + demo | shipped |
| **3** | **Express backend + auth + MongoDB** | **this spec** |
| 4 | Server-side project storage | next |
| 5 | App polish | after #4 |
| 7 | Stripe billing + hosted-model proxy | last |

#3 is a foundation for everything below it. It deliberately ships before #4 so the data-migration work isn't bundled with auth plumbing.

## Scope

### In scope
- Express 4 backend at `server/` (new subfolder in this repo).
- Better Auth 1.x with the MongoDB adapter, cookie sessions, email/password + Google OAuth.
- Password reset flow (email-based token).
- Email verification flow (magic link; soft requirement — unverified users can still use the app).
- Email delivery via Resend (free tier).
- `GET /api/health` health endpoint for Coolify probes.
- `GET /api/me` enriched user profile (plus `planTier: "free"` stub for #7).
- Frontend auth UI: sign-in, sign-up, forgot-password, reset-password, verify-email pages (editorial aesthetic matching the landing).
- Frontend profile page under `/app/profile`.
- Nav bar dropdown: anonymous shows "Sign in"; authenticated shows avatar + Profile/Sign out.
- `useSession()` React hook + `authClient` Better Auth React client.
- Soft email-verification banner on `/app` when `emailVerified === false`.
- Dockerfile + `server/README.md` with Coolify deploy steps.
- All existing anonymous flows continue to work unchanged.

### Out of scope
- Project sync to MongoDB (**#4**).
- Server-side storage of provider API keys (deferred to #4 or #7 — remains BYOK client-side).
- Billing, usage tracking, quotas (**#7**).
- Hosted-model proxy (**#7**).
- Multi-factor authentication.
- Social logins beyond Google (GitHub, Apple, etc.).
- Account deletion UI (the backend supports it via Better Auth; UI comes later).
- Admin console.
- Rate limiting beyond Better Auth's defaults.
- Internationalization.

## Architectural Decisions (from brainstorming)

1. **Monorepo, separate subfolder** — `server/` in the existing repo with its own `package.json`. No workspace tooling (no turborepo/pnpm-workspaces).
2. **Better Auth** — self-hosted, Express adapter, MongoDB adapter. Handles email/pw + OAuth + sessions + reset + verification in one library.
3. **Cookie-based sessions** with `SameSite=None; Secure; HttpOnly; Domain=.exam-helper.your-domain` once a root domain is configured; on initial deploy (default Coolify + Vercel subdomains), cookies use cross-origin CORS with `credentials: 'include'` + a trusted-origins allowlist on the backend.
4. **MongoDB Atlas** via the existing `MONGODB_URI` in the user's `.env`. No self-hosted Mongo.
5. **Deployment via Coolify** on the user's server. Frontend stays on Vercel.

## File Structure

### New files under `server/`

```
server/
├── package.json                          # Node project, isolated deps
├── tsconfig.json                         # strict mode, target ES2022
├── Dockerfile                            # production build
├── .dockerignore
├── .env.example                          # documented template
├── README.md                             # local dev + Coolify deploy
└── src/
    ├── index.ts                          # Express bootstrap + graceful shutdown
    ├── config.ts                         # zod-parsed env
    ├── db.ts                             # MongoDB connection + health check
    ├── auth.ts                           # Better Auth instance + plugins
    ├── email/
    │   ├── resend.ts                     # Resend client + sendEmail implementation
    │   └── templates.ts                  # verification + reset email templates (inline TS)
    ├── routes/
    │   ├── auth.ts                       # mounts Better Auth at /api/auth/*
    │   ├── me.ts                         # GET /api/me
    │   └── health.ts                     # GET /api/health
    └── middleware/
        ├── cors.ts                       # CORS allowlist with credentials
        ├── error.ts                      # JSON error shape { error, code, details? }
        └── request-id.ts                 # assigns X-Request-Id for log correlation
```

### New frontend files

```
src/lib/auth/
├── client.ts                             # authClient = createAuthClient({ baseURL, credentials: 'include' })
├── hooks.ts                              # useSession() wrapper, useAuthRequired()
└── types.ts                              # AuthUser type (mirrors backend)

src/app/(auth)/                           # route group — anonymous-friendly layout
├── layout.tsx                            # centered card on the editorial canvas
├── sign-in/page.tsx                      # email/pw form + Google button
├── sign-up/page.tsx                      # email/pw form + Google button
├── forgot-password/page.tsx              # request reset
├── reset-password/page.tsx               # complete reset (uses ?token=)
└── verify-email/page.tsx                 # "check your inbox" + resend button

src/app/app/profile/page.tsx              # profile view (edit name, view email, sign out)

src/components/auth/
├── auth-dropdown.tsx                     # nav-mounted user dropdown
├── email-verification-banner.tsx         # slim dismissible banner
└── sign-in-button.tsx                    # nav "Sign in" CTA for anonymous users
```

### Modified frontend files

```
src/app/(landing)/_components/landing-nav.tsx   # add <AuthDropdown /> to the right side
src/components/project-list.tsx                  # add <AuthDropdown /> to header
src/components/project-view.tsx                  # add <AuthDropdown /> to header
src/app/app/page.tsx                             # mount <EmailVerificationBanner />
# Note: Better Auth 1.x React client works without a Provider wrapper —
# useSession() reads from an internal nanostore. No layout.tsx change needed.
```

### Environment variables (new)

**Frontend `.env.local` (also in Vercel):**
```env
NEXT_PUBLIC_AUTH_URL=http://localhost:4000      # dev
# Production: https://api.your-domain.com
```

**Backend `server/.env`:**
```env
MONGODB_URI=mongodb+srv://...                    # already exists at repo root; backend reads it
BETTER_AUTH_SECRET=                              # openssl rand -base64 32
BETTER_AUTH_URL=https://api.your-domain.com      # backend's public URL
FRONTEND_URL=https://exam-helper.your-domain.com # for CORS + OAuth redirects

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@your-domain.com

PORT=4000
NODE_ENV=production
```

`MONGODB_URI` is read from `server/.env` (duplicate from the frontend `.env` where user has already configured it — the values can be identical during local dev; separate keys in production are fine).

## Backend — detailed design

### `src/index.ts`

```ts
import express from "express";
import { config } from "./config";
import { connectDb } from "./db";
import { cors } from "./middleware/cors";
import { requestId } from "./middleware/request-id";
import { errorHandler } from "./middleware/error";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";
import { meRouter } from "./routes/me";
import { healthRouter } from "./routes/health";
import { logger } from "./logger";

async function main() {
  await connectDb();

  const app = express();
  app.set("trust proxy", 1); // behind Coolify's reverse proxy
  app.use(requestId);
  app.use(cors);

  // Better Auth's Node handler must mount BEFORE express.json()
  app.all("/api/auth/*", toNodeHandler(auth));

  app.use(express.json({ limit: "64kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/me", meRouter);

  app.use(errorHandler);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "server listening");
  });

  // Graceful shutdown
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      logger.info({ sig }, "shutting down");
      server.close(() => process.exit(0));
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### `src/auth.ts`

```ts
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { mongo } from "./db";
import { config } from "./config";
import { sendEmail } from "./email/resend";
import { verificationEmail, resetPasswordEmail } from "./email/templates";

export const auth = betterAuth({
  database: mongodbAdapter(mongo.db()),
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,

  trustedOrigins: [config.FRONTEND_URL],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // soft require (banner on frontend)
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your exam-helper password",
        html: resetPasswordEmail({ name: user.name, resetUrl: url }),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your exam-helper email",
        html: verificationEmail({ name: user.name, verifyUrl: url }),
      });
    },
  },

  socialProviders: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
    },
  },

  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh if older than a day
    cookieName: "exam-helper.session",
  },

  advanced: {
    crossSubDomainCookies: {
      enabled: false, // flip to true once a shared root domain is wired up
    },
    useSecureCookies: true,
  },
});
```

### `src/middleware/cors.ts`

```ts
import cors from "cors";
import { config } from "../config";

export const corsMiddleware = cors({
  origin: [config.FRONTEND_URL, "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export { corsMiddleware as cors };
```

### `src/routes/me.ts`

```ts
import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";

export const meRouter = Router();

meRouter.get("/", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session?.user) {
    return res.status(401).json({ user: null });
  }
  return res.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      name: session.user.name,
      image: session.user.image,
      createdAt: session.user.createdAt,
    },
    planTier: "free", // stub for #7
  });
});
```

### `src/routes/health.ts`

```ts
import { Router } from "express";
import { mongo } from "../db";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await mongo.db().command({ ping: 1 });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(503).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});
```

### `src/db.ts`

```ts
import { MongoClient } from "mongodb";
import { config } from "./config";
import { logger } from "./logger";

export const mongo = new MongoClient(config.MONGODB_URI);

export async function connectDb(): Promise<void> {
  await mongo.connect();
  await mongo.db().command({ ping: 1 });
  logger.info("mongo connected");
}
```

### `src/config.ts` — zod env validation

```ts
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("4000").transform(Number),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  MONGODB_URI: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().startsWith("re_"),
  RESEND_FROM_EMAIL: z.string().email(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid env:", parsed.error.flatten());
  process.exit(1);
}

export const config = parsed.data;
```

### `server/package.json`

```json
{
  "name": "exam-helper-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-auth": "^1.0.0",
    "cors": "^2.8.5",
    "dotenv": "^17.0.0",
    "express": "^4.21.0",
    "mongodb": "^6.10.0",
    "pino": "^9.5.0",
    "resend": "^4.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "pino-pretty": "^11.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

Dependency versions will be pinned to latest stable at implementation time; these are floors.

### `server/Dockerfile`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD wget --spider -q http://localhost:4000/api/health || exit 1
CMD ["node", "dist/index.js"]
```

## Frontend — detailed design

### `src/lib/auth/client.ts`

```ts
"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL!,
  fetchOptions: { credentials: "include" },
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  forgetPassword,
  resetPassword,
} = authClient;
```

### `src/components/auth/auth-dropdown.tsx`

Anonymous: renders `<Link href="/sign-in">` styled as a subtle nav button.
Authenticated: renders an initials avatar (derived from `user.name` or `user.email`) with a dropdown — Profile / Sign out.

### Route group `(auth)/`

Shared layout is a centered card on the editorial canvas, reusing `var(--canvas)`, `var(--ink)`, `var(--muted)`, `var(--accent)` already defined. Pages use shadcn Button + Input + Label. Google button: plain white with the logo SVG and text "Continue with Google".

### `email-verification-banner.tsx`

Displays on `/app` when `session.user?.emailVerified === false`. Text: *"Verify your email to save your progress across devices."* with a "Resend" button (calls `authClient.verifyEmail.resend()`) and a "Dismiss" button (stores a session-scoped `sessionStorage.setItem('ehv-dismissed', '1')`).

## Dev experience

Two processes during development:

```bash
# Terminal 1: Next frontend
npm run dev   # localhost:3000

# Terminal 2: Express backend
cd server && npm run dev   # localhost:4000
```

Frontend `.env.local`:
```
NEXT_PUBLIC_AUTH_URL=http://localhost:4000
```

Backend reads `server/.env`:
```
MONGODB_URI=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=re_test_...
RESEND_FROM_EMAIL=onboarding@resend.dev
```

No bundler or build step needed during dev — `tsx watch` reloads on change.

## Validation

No automated tests (consistent with the repo's posture). Four gates + manual smoke, matching prior sub-projects.

### Build-time gates (all exit 0)
1. **Backend**: `cd server && npm install && npm run typecheck && npm run build` all exit 0.
2. **Backend**: `cd server && npm run lint` exits 0.
3. **Frontend**: `npm run build`, `npm run lint`, `npx tsc --noEmit` all exit 0 after frontend integration commits.

### Manual smoke (local, both servers running)
1. Visit `http://localhost:3000` — landing renders. Nav shows "Sign in". Anonymous experience unchanged.
2. Click "Sign in" → `/sign-in` route renders the editorial form.
3. Click "Sign up" link at the bottom → `/sign-up` route.
4. Submit sign-up with a real email address → expect a verification email from Resend's sandbox inbox.
5. Click the verification link → `/verify-email?token=...` page shows success and auto-navigates to `/app`.
6. Nav now shows initials avatar; dropdown → Profile goes to `/app/profile`; Sign out works.
7. Sign out, click "Continue with Google" on `/sign-in` → Google consent screen → redirected back to `/app` with session active.
8. On `/app`, banner shows when `emailVerified === false` for Google users (Google's email is pre-verified; it should be `true` and banner hidden).
9. `/forgot-password` → submit email → receive reset email → click link → `/reset-password?token=...` → submit new password → can sign in with new password.
10. `curl http://localhost:4000/api/health` → `{"ok":true}`.
11. `curl http://localhost:4000/api/me` without cookie → `401 {"user":null}`.

### Coolify deployment validation (after deploy)
12. `curl https://api.your-domain.com/api/health` → `{"ok":true}`.
13. Sign-up + verification cycle works end-to-end with production `RESEND_FROM_EMAIL`.
14. Session cookie is set with `SameSite=None; Secure; HttpOnly` when inspected in Chrome DevTools.

### No-go signals
- Better Auth MongoDB adapter incompatibility with the specific `mongodb` driver version → fall back to pinning the exact versions from Better Auth docs.
- CORS setup fails with Coolify's proxy → document the required `X-Forwarded-Proto` trust config (`app.set('trust proxy', 1)` should already handle it) and fix at implementation time.
- Resend free tier hits rate limits → swap for a cheaper-for-transactional provider like Postmark.

## Rollback

- **Full rollback**: close PR unmerged. Frontend keeps working as pure-client (no auth UI depended on yet — auth is additive). Zero production impact.
- **Partial rollback**: revert frontend auth integration commits, keep the backend shipped but unused. Backend running with no callers is safe.
- Backend deploys separately via Coolify; turning it off just means the `Sign in` button 404s its network calls. Fall back gracefully in `useSession()` on 5xx.

## Success Criteria

1. User can sign up with email+password, receive a verification email, verify, and sign in.
2. User can sign in with Google OAuth.
3. User can request a password reset, receive the email, and complete the reset.
4. Session persists across page reloads and survives browser restart for 30 days.
5. Sign-out clears the session cleanly.
6. Anonymous users can still use the landing page, `/app`, `/app/project`, and the full flashcard flow without logging in.
7. All four build gates (frontend build+lint+tsc, backend typecheck+lint) exit 0.
8. Coolify deploy succeeds; `/api/health` reports `{ ok: true }`.
9. PR description documents env-var setup, Coolify deploy steps, and Google OAuth console configuration.
