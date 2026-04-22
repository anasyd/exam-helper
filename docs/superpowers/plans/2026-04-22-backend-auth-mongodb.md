# Backend + Auth + MongoDB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Express backend in `server/` with Better Auth (email/password + Google OAuth), MongoDB Atlas sessions, Resend for transactional email, and a minimal frontend auth UI — while keeping all existing anonymous flows working.

**Architecture:** Monorepo subfolder `server/` is a fully separate Node project with its own `package.json`. Backend mounts Better Auth's Node handler at `/api/auth/*` and adds `GET /api/health` + `GET /api/me`. Frontend uses Better Auth's React client with `credentials: 'include'` for cross-origin cookie sessions. CORS allowlist on the backend trusts the frontend origin. No project/data sync yet (that's sub-project #4).

**Tech Stack:** Node 20, Express 4, Better Auth 1.x + MongoDB adapter, `mongodb` driver 6.x, `cors`, `zod`, `pino`, `dotenv`, Resend (free tier), `tsx` (dev), `tsc` (build). Frontend integrates via `better-auth/react` — no new frontend deps beyond `better-auth`. Docker (node:20-alpine) for Coolify deploy.

**Spec:** `docs/superpowers/specs/2026-04-22-backend-auth-mongodb-design.md`

---

## File Structure

### New files under `server/`

```
server/
├── package.json                          # isolated Node project
├── tsconfig.json                         # strict TypeScript
├── Dockerfile                            # production build
├── .dockerignore
├── .env.example                          # documented env template
├── .gitignore                            # dist/, node_modules/, .env
├── README.md                             # local dev + Coolify deploy
├── eslint.config.mjs                     # flat config, mirrors root project
└── src/
    ├── index.ts                          # Express bootstrap + graceful shutdown
    ├── config.ts                         # zod-parsed env (fails fast)
    ├── logger.ts                         # pino instance
    ├── db.ts                             # MongoDB connection + ping
    ├── auth.ts                           # Better Auth instance + plugins
    ├── email/
    │   ├── resend.ts                     # Resend client + sendEmail()
    │   └── templates.ts                  # HTML for verification + reset
    ├── routes/
    │   ├── health.ts                     # GET /api/health
    │   └── me.ts                         # GET /api/me
    └── middleware/
        ├── cors.ts                       # CORS allowlist + credentials
        ├── error.ts                      # unified JSON error shape
        └── request-id.ts                 # X-Request-Id correlation
```

### New frontend files

```
src/lib/auth/
├── client.ts                             # Better Auth React client + exports
├── hooks.ts                              # useRequireAuth wrapper (optional gating)
└── types.ts                              # AuthUser (mirrors backend shape)

src/app/(auth)/
├── layout.tsx                            # centered card, editorial canvas
├── sign-in/page.tsx                      # email/pw form + Google button
├── sign-up/page.tsx                      # email/pw form + Google button
├── forgot-password/page.tsx              # email input → sends reset
├── reset-password/page.tsx               # token param + new-password form
└── verify-email/page.tsx                 # inbox prompt + resend button

src/app/app/profile/page.tsx              # view email, edit name, sign out

src/components/auth/
├── auth-dropdown.tsx                     # nav dropdown (anon vs signed-in)
├── sign-in-button.tsx                    # anon nav CTA
└── email-verification-banner.tsx         # slim dismissible banner
```

### Modified frontend files

```
src/app/(landing)/_components/landing-nav.tsx    # add <AuthDropdown />
src/components/project-list.tsx                  # add <AuthDropdown /> to header
src/components/project-view.tsx                  # add <AuthDropdown /> to header
src/app/app/page.tsx                             # mount <EmailVerificationBanner />
```

### Modified repo files (top level)

```
.gitignore                                        # add server/dist, server/.env
```

### Validation model

Same four-gate pattern used by sub-projects #1/#2/#6: build, lint, tsc, Playwright smoke. Backend adds its own typecheck + build gates.

---

## Task 1: Branch + server scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.gitignore`
- Create: `server/.dockerignore`
- Create: `server/.env.example`
- Create: `server/eslint.config.mjs`
- Create: `server/README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Confirm clean tree, pull, create branch**

```bash
git status
git pull --ff-only origin main
git checkout -b feat/backend-auth
mkdir -p server/src/routes server/src/middleware server/src/email
```

- [ ] **Step 2: Create `server/package.json`**

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
    "@eslint/js": "^9.15.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.0",
    "eslint": "^9.15.0",
    "pino-pretty": "^13.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.16.0"
  }
}
```

- [ ] **Step 3: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "sourceMap": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create `server/.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.log
```

- [ ] **Step 5: Create `server/.dockerignore`**

```
node_modules
dist
.env
.env.local
.git
.gitignore
README.md
*.log
```

- [ ] **Step 6: Create `server/.env.example`**

```env
# ---------- MongoDB ----------
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/exam-helper

# ---------- Better Auth ----------
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=replace-with-32-plus-byte-random-string
# Backend's public URL (where /api/auth/* is served)
BETTER_AUTH_URL=http://localhost:4000
# Frontend's public URL (for CORS + OAuth redirects)
FRONTEND_URL=http://localhost:3000

# ---------- Google OAuth ----------
# From https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ---------- Resend (transactional email) ----------
# From https://resend.com/api-keys
RESEND_API_KEY=re_
RESEND_FROM_EMAIL=onboarding@resend.dev

# ---------- Runtime ----------
PORT=4000
NODE_ENV=development
```

- [ ] **Step 7: Create `server/eslint.config.mjs`**

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
```

- [ ] **Step 8: Create `server/README.md`**

```markdown
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
```

- [ ] **Step 9: Update root `.gitignore`**

Append to `/Users/anas/Documents/GitHub/exam-helper/.gitignore`:

```
# server
server/node_modules/
server/dist/
server/.env
server/.env.local
```

- [ ] **Step 10: Install server deps**

```bash
cd server
npm install
cd ..
```

Expected: successful install of ~10 prod deps + ~10 dev deps. No lint/typecheck run yet (no source files).

- [ ] **Step 11: Commit**

```bash
git add server/ .gitignore
git commit -m "feat(server): scaffold Express backend package"
```

---

## Task 2: Config + logger

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/logger.ts`

- [ ] **Step 1: Create `server/src/config.ts`**

```ts
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("4000").transform(Number),
  NODE_ENV: z.enum(["development", "production"]).default("development"),

  MONGODB_URI: z.string().startsWith("mongodb"),

  BETTER_AUTH_SECRET: z.string().min(32, "generate with: openssl rand -base64 32"),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  RESEND_API_KEY: z.string().startsWith("re_"),
  RESEND_FROM_EMAIL: z.string().email(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console -- bootstrap error before logger is initialized
  console.error(
    "Invalid env:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
  );
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
```

- [ ] **Step 2: Create `server/src/logger.ts`**

```ts
import pino from "pino";
import { config } from "./config";

export const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  ...(config.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss.l" },
        },
      }
    : {}),
});
```

- [ ] **Step 3: Verify typecheck**

```bash
cd server && npm run typecheck 2>&1 | tail -3 && cd ..
```

Expected: exit 0 (module resolution error on `better-auth`, `express`, etc. is fine — those aren't imported yet in these two files; typecheck only reads what's imported).

- [ ] **Step 4: Commit**

```bash
git add server/src/config.ts server/src/logger.ts
git commit -m "feat(server): add config + logger"
```

---

## Task 3: DB connection

**Files:**
- Create: `server/src/db.ts`

- [ ] **Step 1: Create `server/src/db.ts`**

```ts
import { MongoClient } from "mongodb";
import { config } from "./config";
import { logger } from "./logger";

export const mongo = new MongoClient(config.MONGODB_URI);

export async function connectDb(): Promise<void> {
  await mongo.connect();
  await mongo.db().command({ ping: 1 });
  logger.info({ uri: config.MONGODB_URI.replace(/\/\/[^@]+@/, "//***@") }, "mongo connected");
}

export async function disconnectDb(): Promise<void> {
  await mongo.close();
  logger.info("mongo disconnected");
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd server && npm run typecheck 2>&1 | tail -3 && cd ..
```

Exit 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/db.ts
git commit -m "feat(server): add MongoDB connection"
```

---

## Task 4: Middleware (cors, request-id, error)

**Files:**
- Create: `server/src/middleware/cors.ts`
- Create: `server/src/middleware/request-id.ts`
- Create: `server/src/middleware/error.ts`

- [ ] **Step 1: Create `server/src/middleware/cors.ts`**

```ts
import cors from "cors";
import { config } from "../config";

const allowed = new Set([
  config.FRONTEND_URL,
  "http://localhost:3000",
]);

export const corsMiddleware = cors({
  origin(origin, cb) {
    // Allow same-origin (no Origin header) and listed origins
    if (!origin || allowed.has(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
});
```

- [ ] **Step 2: Create `server/src/middleware/request-id.ts`**

```ts
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const existing = req.header("x-request-id");
  const id = existing ?? randomUUID();
  res.setHeader("X-Request-Id", id);
  // Attach for downstream middleware/logging
  (req as Request & { requestId: string }).requestId = id;
  next();
}
```

- [ ] **Step 3: Create `server/src/middleware/error.ts`**

```ts
import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires 4 args to detect error middleware; keep _next.
  _next: NextFunction
): void {
  const requestId = (req as Request & { requestId?: string }).requestId;
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ err: message, requestId, path: req.path }, "request failed");

  if (res.headersSent) return;

  const status =
    err instanceof Error && /CORS blocked/.test(err.message) ? 403 : 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : message,
    code: status === 500 ? "internal" : "cors",
    requestId,
  });
}
```

- [ ] **Step 4: Verify typecheck**

```bash
cd server && npm run typecheck 2>&1 | tail -3 && cd ..
```

Exit 0.

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/
git commit -m "feat(server): add CORS, request-id, and error middleware"
```

---

## Task 5: Email — Resend client + templates

**Files:**
- Create: `server/src/email/resend.ts`
- Create: `server/src/email/templates.ts`

- [ ] **Step 1: Create `server/src/email/resend.ts`**

```ts
import { Resend } from "resend";
import { config } from "../config";
import { logger } from "../logger";

const client = new Resend(config.RESEND_API_KEY);

export interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<void> {
  try {
    const result = await client.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (result.error) {
      logger.error({ err: result.error, to: opts.to }, "resend send failed");
      throw new Error(`Email send failed: ${result.error.message}`);
    }
    logger.info({ to: opts.to, id: result.data?.id }, "email sent");
  } catch (err) {
    logger.error({ err, to: opts.to }, "resend send threw");
    throw err;
  }
}
```

- [ ] **Step 2: Create `server/src/email/templates.ts`**

Templates are plain inline HTML — no template engine. Editorial palette to match the landing page.

```ts
const BASE_STYLE = `
  font-family: Georgia, serif;
  color: #111111;
  background-color: #fafaf7;
  padding: 32px;
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.6;
`;

const BUTTON_STYLE = `
  display: inline-block;
  background-color: #111111;
  color: #fafaf7;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 2px;
  font-family: -apple-system, system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  margin: 24px 0;
`;

const FOOTER_STYLE = `
  font-family: -apple-system, system-ui, sans-serif;
  font-size: 12px;
  color: #55534e;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #e8e3d8;
`;

export function verificationEmail(opts: { name?: string | null; verifyUrl: string }): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  return `
<div style="${BASE_STYLE}">
  <div style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #b8854a; margin-bottom: 24px;">◇ exam-helper</div>
  <h1 style="font-size: 28px; font-weight: 400; letter-spacing: -0.01em; margin: 0 0 16px;">Verify your email</h1>
  <p>${greeting}</p>
  <p>Thanks for signing up. Click the button below to verify your email address — it's good for 24 hours.</p>
  <a href="${opts.verifyUrl}" style="${BUTTON_STYLE}">Verify email →</a>
  <p style="font-size: 13px; color: #55534e;">
    Or paste this link into your browser:<br>
    <code style="word-break: break-all;">${opts.verifyUrl}</code>
  </p>
  <div style="${FOOTER_STYLE}">
    If you didn't sign up for exam-helper, you can safely ignore this email.
  </div>
</div>
`.trim();
}

export function resetPasswordEmail(opts: { name?: string | null; resetUrl: string }): string {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi,";
  return `
<div style="${BASE_STYLE}">
  <div style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #b8854a; margin-bottom: 24px;">◇ exam-helper</div>
  <h1 style="font-size: 28px; font-weight: 400; letter-spacing: -0.01em; margin: 0 0 16px;">Reset your password</h1>
  <p>${greeting}</p>
  <p>We received a request to reset your password. Click the button below to pick a new one — the link expires in 1 hour.</p>
  <a href="${opts.resetUrl}" style="${BUTTON_STYLE}">Reset password →</a>
  <p style="font-size: 13px; color: #55534e;">
    Or paste this link into your browser:<br>
    <code style="word-break: break-all;">${opts.resetUrl}</code>
  </p>
  <div style="${FOOTER_STYLE}">
    If you didn't request this, you can safely ignore the email — your password won't change.
  </div>
</div>
`.trim();
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd server && npm run typecheck 2>&1 | tail -3 && cd ..
```

Exit 0.

- [ ] **Step 4: Commit**

```bash
git add server/src/email/
git commit -m "feat(server): add Resend client + HTML email templates"
```

---

## Task 6: Better Auth instance

**Files:**
- Create: `server/src/auth.ts`

- [ ] **Step 1: Create `server/src/auth.ts`**

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

  trustedOrigins: [config.FRONTEND_URL, "http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
    // Soft require — unverified users can still use the app; banner on frontend prompts verification.
    requireEmailVerification: false,
    minPasswordLength: 8,
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
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // rolling refresh once per day
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  advanced: {
    useSecureCookies: config.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "none",
      secure: config.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 2: Verify typecheck**

```bash
cd server && npm run typecheck 2>&1 | tail -5 && cd ..
```

Exit 0. If Better Auth's TypeScript surface has evolved, rename fields to match its current docs — keep the option semantics identical (enabled, minPasswordLength, sendResetPassword, sendVerificationEmail, socialProviders.google, session expiry, cookie attributes).

- [ ] **Step 3: Commit**

```bash
git add server/src/auth.ts
git commit -m "feat(server): configure Better Auth with email/pw + Google OAuth"
```

---

## Task 7: Routes (health + me)

**Files:**
- Create: `server/src/routes/health.ts`
- Create: `server/src/routes/me.ts`

- [ ] **Step 1: Create `server/src/routes/health.ts`**

```ts
import { Router } from "express";
import { mongo } from "../db";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await mongo.db().command({ ping: 1 });
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
```

- [ ] **Step 2: Create `server/src/routes/me.ts`**

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
    res.status(401).json({ user: null });
    return;
  }
  res.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      name: session.user.name,
      image: session.user.image,
      createdAt: session.user.createdAt,
    },
    planTier: "free",
  });
});
```

- [ ] **Step 3: Verify typecheck**

```bash
cd server && npm run typecheck 2>&1 | tail -5 && cd ..
```

Exit 0. If `fromNodeHeaders` is under a different path in the current Better Auth version, update the import; the symbol exists in `better-auth/node` as of 1.x.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/
git commit -m "feat(server): add /api/health and /api/me routes"
```

---

## Task 8: Express bootstrap

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/index.ts`**

```ts
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { config } from "./config";
import { logger } from "./logger";
import { connectDb, disconnectDb } from "./db";
import { auth } from "./auth";
import { corsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/request-id";
import { errorHandler } from "./middleware/error";
import { healthRouter } from "./routes/health";
import { meRouter } from "./routes/me";

async function main(): Promise<void> {
  await connectDb();

  const app = express();
  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(corsMiddleware);

  // Better Auth's handler must come BEFORE express.json() — it parses request bodies itself.
  app.all("/api/auth/*", toNodeHandler(auth));

  app.use(express.json({ limit: "64kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/me", meRouter);

  app.use(errorHandler);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, "server listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Fallback if close hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- bootstrap failure; logger may not be initialized
  console.error("Fatal startup error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify typecheck + build**

```bash
cd server && npm run typecheck 2>&1 | tail -3 && npm run build 2>&1 | tail -5 && cd ..
```

Both exit 0. `dist/index.js` should exist after the build.

- [ ] **Step 3: Lint**

```bash
cd server && npm run lint 2>&1 | tail -5 && cd ..
```

Exit 0 with zero errors. Warnings are OK.

- [ ] **Step 4: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(server): bootstrap Express app with Better Auth handler mount"
```

---

## Task 9: Dockerfile

**Files:**
- Create: `server/Dockerfile`

- [ ] **Step 1: Create `server/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Coolify passes $PORT at runtime; default to 4000.
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:${PORT}/api/health || exit 1

USER node
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Verify the image builds locally** (optional but fast)

```bash
cd server
docker build -t exam-helper-server:test . 2>&1 | tail -5
cd ..
```

Expected: a successful build. If Docker isn't available locally, skip — Coolify will build it.

- [ ] **Step 3: Commit**

```bash
git add server/Dockerfile
git commit -m "feat(server): add production Dockerfile"
```

---

## Task 10: Local smoke of backend

**Files:** none modified. This is a manual validation step.

- [ ] **Step 1: Copy `.env.example` to `.env` and fill real values**

```bash
cd server
cp .env.example .env
```

Edit `server/.env` to put in:
- `MONGODB_URI` — your Atlas URI (reuse the one the user already has set up).
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from console.cloud.google.com (see `server/README.md`).
- `RESEND_API_KEY` — free key from resend.com.
- Other fields keep defaults.

- [ ] **Step 2: Run the dev server**

```bash
cd server
npm run dev 2>&1 | head -30
```

Expected output includes: `mongo connected`, `server listening { port: 4000, env: 'development' }`.

- [ ] **Step 3: Test /api/health**

```bash
curl -s http://localhost:4000/api/health
```

Expected: `{"ok":true}`.

- [ ] **Step 4: Test /api/me without session**

```bash
curl -s -i http://localhost:4000/api/me
```

Expected: `HTTP/1.1 401` and `{"user":null}`.

- [ ] **Step 5: Test /api/auth/session endpoint exists**

```bash
curl -s -i http://localhost:4000/api/auth/session
```

Expected: a JSON response (likely `{"session":null,"user":null}` or `null` depending on Better Auth's default). Non-404 — confirms the mount worked.

- [ ] **Step 6: Stop the dev server (Ctrl+C)**

- [ ] **Step 7: No code changes — no commit needed.** If any of the steps surfaced bugs, fix them in the relevant task's file, re-run, then commit.

---

## Task 11: Frontend — auth client library

**Files:**
- Modify: `package.json` (add `better-auth` to frontend deps)
- Create: `src/lib/auth/client.ts`
- Create: `src/lib/auth/types.ts`
- Create: `src/lib/auth/hooks.ts`

- [ ] **Step 1: Install better-auth in the frontend**

From the repo root:
```bash
npm install better-auth
```

Expected: `better-auth` added to `dependencies` in the root `package.json`.

- [ ] **Step 2: Create `src/lib/auth/types.ts`**

```ts
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  createdAt: string | Date;
}

export interface MeResponse {
  user: AuthUser;
  planTier: "free";
}
```

- [ ] **Step 3: Create `src/lib/auth/client.ts`**

```ts
"use client";

import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_AUTH_URL;

if (!baseURL) {
  // Fail loud in dev; in production this env var MUST be set at build time.
  // eslint-disable-next-line no-console -- misconfiguration surface
  console.warn(
    "[auth] NEXT_PUBLIC_AUTH_URL is not set — auth features will not work."
  );
}

export const authClient = createAuthClient({
  baseURL: baseURL ?? "http://localhost:4000",
  fetchOptions: {
    credentials: "include",
  },
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

- [ ] **Step 4: Create `src/lib/auth/hooks.ts`**

```ts
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "./client";

/**
 * Client-side gate: redirects to /sign-in if no session.
 * Mount at the top of any page that requires a logged-in user.
 */
export function useRequireAuth(redirectTo = "/sign-in"): ReturnType<typeof useSession> {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.isPending) return;
    if (!session.data?.user) {
      router.replace(redirectTo);
    }
  }, [session.data, session.isPending, router, redirectTo]);

  return session;
}
```

- [ ] **Step 5: Update frontend `.env.local`**

Create or update `.env.local` at repo root:

```env
NEXT_PUBLIC_AUTH_URL=http://localhost:4000
```

Note: `.env.local` is gitignored. For Vercel production, add the variable in the Vercel dashboard with the production backend URL (e.g., `https://api.your-domain.com`).

- [ ] **Step 6: Verify frontend gates**

```bash
npm run build 2>&1 | tail -5
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -3
```

All exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/auth/
git commit -m "feat(auth): add frontend auth client + useRequireAuth hook"
```

---

## Task 12: Auth route group + layout

**Files:**
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create `src/app/(auth)/layout.tsx`**

This layout mirrors the editorial landing aesthetic: centered card on the warm canvas.

```tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} landing-surface min-h-screen`}
    >
      <nav className="border-b border-[color:var(--rule)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="display text-xl flex items-center gap-2"
          >
            <span className="text-[color:var(--accent)]">◇</span>
            exam-helper
          </Link>
        </div>
      </nav>
      <main className="max-w-md mx-auto px-6 py-16 md:py-24">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Exit 0. The `(auth)` route group compiles without a `page.tsx` yet.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/layout.tsx"
git commit -m "feat(auth): add (auth) route group with editorial layout"
```

---

## Task 13: Sign-in page

**Files:**
- Create: `src/app/(auth)/sign-in/page.tsx`

- [ ] **Step 1: Create `src/app/(auth)/sign-in/page.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/app",
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed");
      return;
    }
    router.replace("/app");
  }

  async function handleGoogle() {
    setLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app",
    });
    // Browser redirects to Google; nothing to do after await resolves.
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl mb-2">Welcome back</h1>
        <p className="text-[color:var(--muted)]">
          Sign in to pick up where you left off.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={loading}
      >
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-[color:var(--rule)]" />
        <span className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          or
        </span>
        <div className="flex-1 border-t border-[color:var(--rule)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[color:var(--muted)] hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-[color:var(--muted)]">
        No account?{" "}
        <Link href="/sign-up" className="underline text-[color:var(--ink)]">
          Create one
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Exit 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/sign-in/page.tsx"
git commit -m "feat(auth): add sign-in page with email/pw + Google"
```

---

## Task 14: Sign-up page

**Files:**
- Create: `src/app/(auth)/sign-up/page.tsx`

- [ ] **Step 1: Create `src/app/(auth)/sign-up/page.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: "/app",
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message ?? "Sign-up failed");
      return;
    }
    toast.success("Account created. Check your inbox to verify your email.");
    router.replace("/verify-email?email=" + encodeURIComponent(email));
  }

  async function handleGoogle() {
    setLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app",
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl mb-2">Create your account</h1>
        <p className="text-[color:var(--muted)]">
          Save your projects across devices.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={loading}
      >
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-[color:var(--rule)]" />
        <span className="text-xs uppercase tracking-wider text-[color:var(--muted)]">
          or
        </span>
        <div className="flex-1 border-t border-[color:var(--rule)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <p className="text-xs text-[color:var(--muted)]">At least 8 characters.</p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-[color:var(--muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline text-[color:var(--ink)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Exit 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/sign-up/page.tsx"
git commit -m "feat(auth): add sign-up page with email/pw + Google"
```

---

## Task 15: Forgot-password + reset-password pages

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Create `src/app/(auth)/forgot-password/page.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await authClient.forgetPassword({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't send reset email");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="display text-4xl">Check your inbox</h1>
        <p className="text-[color:var(--muted)]">
          We sent a reset link to <strong>{email}</strong>. The link expires in 1 hour.
        </p>
        <Link
          href="/sign-in"
          className="inline-block text-sm underline text-[color:var(--ink)]"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl mb-2">Reset your password</h1>
        <p className="text-[color:var(--muted)]">
          We'll send a link to your email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-[color:var(--muted)]">
        <Link href="/sign-in" className="underline text-[color:var(--ink)]">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(auth)/reset-password/page.tsx`**

```tsx
"use client";

import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="display text-4xl">Invalid link</h1>
        <p className="text-[color:var(--muted)]">
          This reset link is missing a token. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm underline text-[color:var(--ink)]"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't reset password");
      return;
    }
    toast.success("Password reset. Please sign in.");
    router.replace("/sign-in");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl mb-2">Choose a new password</h1>
        <p className="text-[color:var(--muted)]">At least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/forgot-password/page.tsx" "src/app/(auth)/reset-password/page.tsx"
git commit -m "feat(auth): add forgot-password and reset-password pages"
```

---

## Task 16: Verify-email page

**Files:**
- Create: `src/app/(auth)/verify-email/page.tsx`

- [ ] **Step 1: Create `src/app/(auth)/verify-email/page.tsx`**

This page has two modes: (a) "check your inbox" prompt shown after signup, (b) if the URL carries `?token=...`, submit it to Better Auth. Better Auth typically handles verification via a link that hits `/api/auth/verify-email?token=…` on the backend and redirects to the frontend on success — in that case this page is only the inbox prompt. Keep the token-handling path as a fallback.

```tsx
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) {
      toast.error("No email on record. Sign up again to trigger verification.");
      return;
    }
    setResending(true);
    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/app",
    });
    setResending(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't resend");
      return;
    }
    toast.success("Verification email sent.");
  }

  return (
    <div className="space-y-6 text-center">
      <h1 className="display text-4xl">Check your inbox</h1>
      <p className="text-[color:var(--muted)]">
        {email ? (
          <>We sent a verification link to <strong>{email}</strong>. Click it to complete signup.</>
        ) : (
          <>We sent you a verification email. Click the link inside to complete signup.</>
        )}
      </p>

      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          disabled={resending || !email}
        >
          {resending ? "Sending…" : "Resend"}
        </Button>
        <Link href="/app" className="text-sm underline text-[color:var(--ink)]">
          Continue anyway
        </Link>
      </div>

      <p className="text-xs text-[color:var(--muted)]">
        Didn't get it? Check spam, or come back and retry from{" "}
        <Link href="/sign-in" className="underline">sign in</Link>.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Exit 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/verify-email/page.tsx"
git commit -m "feat(auth): add verify-email inbox-prompt page"
```

---

## Task 17: Auth components (dropdown, sign-in button, verification banner)

**Files:**
- Create: `src/components/auth/sign-in-button.tsx`
- Create: `src/components/auth/auth-dropdown.tsx`
- Create: `src/components/auth/email-verification-banner.tsx`

- [ ] **Step 1: Create `src/components/auth/sign-in-button.tsx`**

```tsx
"use client";

import Link from "next/link";

export function SignInButton() {
  return (
    <Link
      href="/sign-in"
      className="text-sm px-4 py-2 rounded-sm border border-[color:var(--ink)] hover:bg-[color:var(--ink)] hover:text-[color:var(--canvas)] transition-colors"
    >
      Sign in
    </Link>
  );
}
```

- [ ] **Step 2: Create `src/components/auth/auth-dropdown.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth/client";
import { SignInButton } from "./sign-in-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFrom(name: string | null | undefined, email: string): string {
  const source = (name ?? email).trim();
  if (!source) return "?";
  const parts = source.split(/[\s@]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || source[0]!.toUpperCase();
}

export function AuthDropdown() {
  const session = useSession();
  const router = useRouter();

  if (session.isPending) {
    // Reserve space so nav doesn't shift on hydration
    return <div className="w-24 h-9" aria-hidden="true" />;
  }

  if (!session.data?.user) {
    return <SignInButton />;
  }

  const user = session.data.user;
  const initials = initialsFrom(user.name ?? null, user.email);

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Signed out");
    router.replace("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-[color:var(--ink)] text-[color:var(--canvas)] text-sm font-medium flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Account"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <div className="text-sm font-medium truncate">{user.name ?? user.email}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app">My projects</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Create `src/components/auth/email-verification-banner.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth/client";

const DISMISS_KEY = "ehv-dismissed";

export function EmailVerificationBanner() {
  const session = useSession();
  const [dismissed, setDismissed] = useState(true); // start dismissed to avoid flash
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    }
  }, []);

  if (dismissed || !session.data?.user || session.data.user.emailVerified) {
    return null;
  }

  async function handleResend() {
    setSending(true);
    const result = await authClient.sendVerificationEmail({
      email: session.data!.user.email,
      callbackURL: "/app",
    });
    setSending(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't send email");
      return;
    }
    toast.success("Verification email sent.");
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="bg-[color:var(--accent)] bg-opacity-10 border-b border-[color:var(--rule)] px-6 py-3 text-sm flex items-center justify-center gap-3 flex-wrap">
      <span>
        Verify your email to save your progress across devices.
      </span>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        className="underline hover:no-underline disabled:opacity-50"
      >
        {sending ? "Sending…" : "Resend"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-xs text-muted-foreground hover:underline ml-2"
        aria-label="Dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify build + lint**

```bash
npm run build 2>&1 | tail -5
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -3
```

All exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/
git commit -m "feat(auth): add AuthDropdown + SignInButton + EmailVerificationBanner"
```

---

## Task 18: Profile page

**Files:**
- Create: `src/app/app/profile/page.tsx`

- [ ] **Step 1: Create `src/app/app/profile/page.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { useRequireAuth } from "@/lib/auth/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const session = useRequireAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (session.isPending || !session.data?.user) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const user = session.data.user;
  const displayName = name || user.name || "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === user.name) return;
    setSaving(true);
    const result = await authClient.updateUser({ name: name.trim() });
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't save");
      return;
    }
    toast.success("Name updated");
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/");
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 space-y-10">
      <div>
        <Link href="/app" className="text-sm text-muted-foreground hover:underline">
          ← Back to projects
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-semibold mb-2">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user.email} disabled />
          {!user.emailVerified && (
            <p className="text-xs text-[color:var(--accent,#b8854a)]">
              Unverified — check your inbox for the verification link.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder={user.name ?? "Your name"}
            value={displayName}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <Button type="submit" disabled={saving || !name.trim() || name === user.name}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>

      <div className="pt-6 border-t">
        <Button type="button" variant="outline" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/app/profile/page.tsx
git commit -m "feat(auth): add profile page (edit name, view email, sign out)"
```

---

## Task 19: Wire AuthDropdown into existing nav surfaces

**Files:**
- Modify: `src/app/(landing)/_components/landing-nav.tsx`
- Modify: `src/components/project-list.tsx`
- Modify: `src/components/project-view.tsx`
- Modify: `src/app/app/page.tsx`

- [ ] **Step 1: Update `src/app/(landing)/_components/landing-nav.tsx`**

Replace the "Try it free" link on the right with `<AuthDropdown />`. For unauthenticated users it renders "Sign in" (so the CTA surface still feels inviting); for authenticated users it becomes an avatar dropdown. We keep "Try it free" accessible by making the wordmark still a Link and adding a secondary CTA in the hero — so this task just updates the nav.

Final content of `src/app/(landing)/_components/landing-nav.tsx`:

```tsx
import Link from "next/link";
import { AuthDropdown } from "@/components/auth/auth-dropdown";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[rgba(250,250,247,0.85)] border-b border-[color:var(--rule)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="display text-xl tracking-tight flex items-center gap-2"
        >
          <span className="text-[color:var(--accent)]">◇</span>
          <span>exam-helper</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="text-sm px-4 py-2 rounded-sm bg-[color:var(--ink)] text-[color:var(--canvas)] hover:opacity-90 transition-opacity"
          >
            Try it free
          </Link>
          <AuthDropdown />
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update `src/components/project-list.tsx`**

Locate the header where the "← Home" Link, Settings, and "New Project" buttons live. Add `<AuthDropdown />` as the LAST child of that group (far right).

```tsx
// Add import at top:
import { AuthDropdown } from "@/components/auth/auth-dropdown";

// In the header JSX:
<div className="flex items-center gap-3">
  <Link href="/" className="...">← Home</Link>
  <AppSettings />
  <Button onClick={...}>New Project</Button>
  <AuthDropdown />
</div>
```

The exact existing classes and structure stay; only the `AuthDropdown` element is added. Grep for the "New Project" button in `project-list.tsx` to locate the right spot.

- [ ] **Step 3: Update `src/components/project-view.tsx`**

Same pattern. In the project-view's header (where Back, XP, Share, Settings already live), add `<AuthDropdown />` to the right-side button group.

```tsx
// Add import:
import { AuthDropdown } from "@/components/auth/auth-dropdown";

// In the header's right-side cluster:
<AuthDropdown />
```

Place it AFTER the Settings button.

- [ ] **Step 4: Mount EmailVerificationBanner on `/app`**

Modify `src/app/app/page.tsx`:

```tsx
"use client";

import { Suspense } from "react";
import { ProjectList } from "@/components/project-list";
import { SharedProjectHandler } from "@/components/shared-project-handler";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";

export default function AppHome() {
  return (
    <>
      <EmailVerificationBanner />
      <ProjectList />
      <Suspense fallback={null}>
        <SharedProjectHandler />
      </Suspense>
    </>
  );
}
```

- [ ] **Step 5: Verify build + lint + tsc**

```bash
npm run build 2>&1 | tail -10
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -3
```

All exit 0.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(landing)/_components/landing-nav.tsx" src/components/project-list.tsx src/components/project-view.tsx src/app/app/page.tsx
git commit -m "feat(auth): wire AuthDropdown into nav surfaces and banner on /app"
```

---

## Task 20: Local end-to-end smoke

**Files:** none modified. Manual validation step with both processes running.

- [ ] **Step 1: Open two terminals**

Terminal A:
```bash
cd server
npm run dev
```
Expected: `server listening { port: 4000 }`.

Terminal B (from repo root):
```bash
npm run dev
```
Expected: Next dev server on port 3000.

- [ ] **Step 2: Navigate to `http://localhost:3000`**

- Landing page renders as before.
- Top-right nav now shows "Try it free" (unchanged) AND a "Sign in" button next to it.
- 0 console errors related to auth (network calls to `/api/auth/session` should return 200 with `{user: null}`).

- [ ] **Step 3: Click "Sign in" → `/sign-in`**

- Editorial layout centered card.
- Google button and email form visible.

- [ ] **Step 4: Click "Create one" → `/sign-up`**

- Sign-up form visible. Submit with a test email you control.
- After submit, expect a redirect to `/verify-email?email=...`.
- Check inbox (or Resend dashboard logs) for a verification email with the editorial template.

- [ ] **Step 5: Click the verification link in the email**

- Link goes to `/api/auth/verify-email?token=...` on the backend.
- Backend sets the verified flag and redirects to `/app` (Better Auth default with `autoSignInAfterVerification: true`).
- On `/app`, nav now shows the user's initials avatar. Click it — dropdown lists Profile + My projects + Sign out.

- [ ] **Step 6: Click Profile → `/app/profile`**

- Email field disabled with the signed-up email.
- Name field pre-filled. Edit the name, click Save → toast "Name updated".
- Click Sign out → redirected to `/`.

- [ ] **Step 7: Click "Sign in" again → click "Continue with Google"**

- Redirects to Google's consent page.
- After consent, returns to `/app` with the Google account logged in.
- Dropdown shows Google account name.

- [ ] **Step 8: Check `/app` email-verification banner**

- Sign in with the email/password account (not Google). On `/app`, the banner says "Verify your email to save your progress across devices." with Resend + Dismiss buttons.
- Click Dismiss — banner hides for the rest of the session.
- Reload the page — banner stays hidden (sessionStorage).

- [ ] **Step 9: Test forgot-password**

- Sign out. Go to `/forgot-password`. Submit your email.
- Receive reset email. Click the link → `/reset-password?token=...`.
- Submit a new password → redirected to `/sign-in` with a success toast.
- Sign in with the new password successfully.

- [ ] **Step 10: Stop both dev servers (Ctrl+C in each terminal)**

No commit needed. If anything fails, fix in the task owning the broken file, re-test, then commit.

---

## Task 21: Final verification gates + PR

**Files:** none modified (unless gates uncover an issue).

- [ ] **Step 1: Clean backend build**

```bash
cd server
rm -rf dist node_modules
npm install
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -3
npm run build 2>&1 | tail -3
cd ..
```

All exit 0. `server/dist/index.js` exists.

- [ ] **Step 2: Clean frontend build**

```bash
rm -rf .next
npm run build 2>&1 | tail -8
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -3
```

All exit 0.

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/backend-auth
```

- [ ] **Step 4: Create PR body at `/tmp/pr-body-backend.md`**

```markdown
## Summary

Adds an Express backend in `server/` with Better Auth (email/password + Google OAuth), MongoDB Atlas sessions, Resend transactional email, and a full frontend auth UI. Anonymous use still works — login is opt-in.

## What's new

### Backend (`server/`)
- Express 4 + TypeScript strict, runs on Node 20.
- Better Auth 1.x mounted at `/api/auth/*`, MongoDB adapter against the existing Atlas URI.
- Email/password signup + login + password reset + email verification, plus Google OAuth.
- Resend for transactional email (editorial HTML templates).
- `GET /api/health` (Coolify probe) and `GET /api/me` (current user + plan stub).
- Cookie sessions: `HttpOnly; Secure; SameSite=None`; 30-day rolling expiry.
- Dockerfile for Coolify, with `HEALTHCHECK` and non-root user.
- Structured logging (pino), request-id correlation, zod-parsed env, graceful shutdown.

### Frontend
- `better-auth/react` client at `src/lib/auth/client.ts` with `credentials: 'include'`.
- Route group `(auth)` with editorial layout: sign-in, sign-up, forgot-password, reset-password, verify-email.
- `/app/profile` page — view email, edit name, sign out.
- `AuthDropdown` in the landing nav, project-list header, and project-view header — anonymous sees "Sign in", logged-in sees initials avatar.
- `EmailVerificationBanner` on `/app` for unverified email users (dismissible per session).
- Anonymous flow (landing, `/app`, demo project, flashcard generation) unchanged.

## Test plan

- [x] Backend: `cd server && npm run typecheck && npm run lint && npm run build` — all exit 0
- [x] Frontend: `npm run build`, `npm run lint`, `npx tsc --noEmit` — all exit 0
- [x] Local E2E smoke with both servers:
  - [x] Email/password signup → verification email sent → verify link → auto-signed in
  - [x] Google OAuth signup/signin
  - [x] Forgot-password → reset link → new password works
  - [x] Email-verification banner shows + dismisses + persists across reload
  - [x] Profile page: edit name, sign out
  - [x] `curl /api/health` → `{ ok: true }`, `curl /api/me` without cookie → 401
- [ ] **Manual before merge** (requires deployment):
  - [ ] Deploy backend to Coolify, set env vars per `server/.env.example`
  - [ ] Set `NEXT_PUBLIC_AUTH_URL` in Vercel to the Coolify domain
  - [ ] Configure Google OAuth redirect URIs for the production Coolify URL
  - [ ] Verify signup → verification cycle end-to-end in production
  - [ ] Confirm session cookie inspects as `SameSite=None; Secure; HttpOnly`

## Deployment

See `server/README.md` for full Coolify + Google OAuth + Resend setup steps.

## Out of scope (future sub-projects)

- Syncing localStorage projects to MongoDB (**#4**)
- Storing provider API keys on the server (**#4** or **#7**)
- Billing + hosted-model proxy (**#7**)
- Account deletion UI, MFA, more OAuth providers
```

- [ ] **Step 5: Open the PR**

```bash
gh pr create --title "feat: Express backend + Better Auth + MongoDB + Google OAuth" --body "$(cat /tmp/pr-body-backend.md)" 2>&1 | tail -3
```

Expected: PR URL printed.

- [ ] **Step 6: Done — return the PR URL.**

---

## Self-Review Summary

**Spec coverage:**
- Server scaffold, tsconfig, lint, Dockerfile → Tasks 1, 9
- Config (zod) + logger → Task 2
- MongoDB connection → Task 3
- Middleware (CORS, request-id, error) → Task 4
- Email (Resend) + HTML templates → Task 5
- Better Auth instance with email/pw + Google OAuth + soft verification → Task 6
- Health + /api/me endpoints → Task 7
- Express bootstrap + graceful shutdown → Task 8
- Local smoke of backend → Task 10
- Frontend auth client + types + hooks → Task 11
- Auth route group + layout → Task 12
- Sign-in, sign-up → Tasks 13-14
- Forgot + reset password → Task 15
- Verify-email page → Task 16
- AuthDropdown, SignInButton, EmailVerificationBanner → Task 17
- Profile page → Task 18
- Nav integration + banner mount → Task 19
- Local E2E smoke → Task 20
- Final gates + PR → Task 21

**Placeholder scan:** No TBDs. The note in Task 6 about Better Auth's exact option names ("if Better Auth's TypeScript surface has evolved, rename fields to match its current docs") is an informed escape hatch, not a placeholder — the option semantics are specified.

**Type consistency:**
- `AuthUser`, `MeResponse` — defined in Task 11, consumed in Task 17 (AuthDropdown reads `session.data.user` which has these fields) and Task 18 (profile page).
- Better Auth methods `signIn.email`, `signUp.email`, `signIn.social`, `forgetPassword`, `resetPassword`, `sendVerificationEmail`, `signOut`, `updateUser` — all referenced consistently across Tasks 13-18; re-exported from `authClient` in Task 11.
- Frontend `NEXT_PUBLIC_AUTH_URL` ↔ backend `FRONTEND_URL` + `BETTER_AUTH_URL` — env var names consistent across Tasks 1, 11, and the spec.

**Total tasks:** 21. Similar granularity to sub-project #6. The plan intentionally batches scaffold work (Task 1) and the final gate (Task 21), while keeping each auth page as its own commit so a reviewer can bisect if a specific flow misbehaves.
