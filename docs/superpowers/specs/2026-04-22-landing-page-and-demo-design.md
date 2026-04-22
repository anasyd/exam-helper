# Landing Page + Demo — Design

**Status:** approved (awaiting user spec review)
**Date:** 2026-04-22
**Sub-project:** 6 of 7 (revised roadmap; the user elected to pull this forward before the backend/auth work in #3)
**Branch target:** `feat/landing-page-and-demo`

## Context

The app at `/` is currently the project list — users arriving at the root URL immediately see an empty-state "No Projects Yet" card. This is fine for existing users but wrong for everyone else: there is no marketing surface, no explanation of what the product does, and no invitation to try it. The audience (university students + certification candidates) arrives from shared links, word of mouth, and future SEO; they need a first surface that explains the value in seconds and routes them into the product without friction.

Sub-project #2 (multi-provider AI) just shipped. The app now supports Gemini, OpenAI, Anthropic, and OpenRouter with per-feature routing and vision — this is the hero capability the landing page should showcase. The demo video, recorded against the live app, will include a moment where the user switches the default provider in Settings to make the multi-provider story tangible.

No backend exists yet (Express + auth is sub-project #3; Stripe billing is sub-project #7). The landing page ships as a purely static client surface on the existing Vercel deployment. CTA is "Try it free" → `/app`. No waitlist, no email capture, no auth buttons.

## Goal

Ship an editorial-aesthetic landing page at `/` that converts first-time visitors into app users (via a single "Try it free" CTA), showcases the multi-provider capability with an auto-looping demo video, and moves the existing app to `/app/*` without breaking shared-project links.

## Roadmap Position

| # | Sub-project | Status |
|---|---|---|
| 1 | Package updates | shipped |
| 2 | Multi-provider AI | shipped |
| **6** | **Landing page + demo** | **this spec** |
| 3 | Express backend + auth + MongoDB | next |
| 4 | Server-side project storage | after #3 |
| 5 | App polish | after #4 |
| 7 | Stripe billing + hosted-model proxy | last |

Sub-project #6 is not blocked by anything above and does not block anything below.

## Scope

### In scope
- Editorial landing page at `/` with: sticky nav, hero, inline demo video, 4-tile feature grid, 3-step how-it-works, 6-item FAQ, footer.
- Single CTA "Try it free" linking to `/app`. No secondary CTAs, no waitlist, no email capture.
- Relocate the existing app: project list `/` → `/app`, project view `/project` → `/app/project`.
- Back-compat: `/?share=...` client-redirects to `/app?share=...`.
- Update `createShareableLink()` in the store to emit `/app?share=...` URLs.
- Record a ~18-20s silent looping demo MP4 via the `claude-screen-recorder` skill; commit `public/demo.mp4` and `public/demo-poster.png`.
- Editorial palette + typography (Fraunces display + Inter body + warm off-white canvas + ink-black primary).
- Meta tags + Open Graph image (`public/og-image.png`) for link previews.
- Page is fully static, CDN-friendly, no new runtime deps.

### Out of scope
- Blog, testimonials, pricing page, competitor comparison, auth buttons, pricing teaser — defer to #7 and beyond.
- Email capture / waitlist — defer to #7.
- Dark mode — deferred (user explicitly said "can be added later").
- i18n — defer.
- Custom analytics beyond Vercel's default — defer.
- Redesigning the app (`/app/*`) — out of scope. App polish is #5.
- New font self-hosting infrastructure — we use `next/font/google` (already available in Next 16) rather than shipping `.woff2` files manually. Keeps the spec honest about "no new runtime deps."

## Approach

Add a Next.js **route group** `(landing)` that owns the `/` route and its own layout (wider container, editorial font stack, subtle grain). The existing app moves one directory level down to `/app`. A back-compat redirect on `/` handles legacy `?share=...` links that pre-date the restructure.

Demo is a real MP4 recorded by driving the live dev server through a Playwright-based scenario via the `claude-screen-recorder` skill. The recording uses a **seeded dev-mode project** so flashcard generation in the video is instant — the real UI, just with pre-populated backing data so no live provider call is needed during capture.

Page composition: six top-level sections, each a focused React component in `src/app/(landing)/_components/`. No external UI library beyond what the app already uses (shadcn primitives: Button, Accordion). Motion is restrained — one entry-fade on the hero, Accordion's default transitions on FAQ, `<video>` autoplay-loop-muted for the demo, and nothing else.

## Roadmap dependency check

- **PR #4 (multi-provider AI)** must be merged to `main` before this sub-project starts. The landing page copy and demo both reference the multi-provider story as shipped; the demo recording exercises the new Settings dialog. *Current status: #4 merged at commit `590f2d8` before this spec was written.*
- **No downstream blockers.** #3 (backend) will add a "Sign in" button to the nav later, but the landing can ship without it today.

## File Structure

### New files

```
src/app/
├── (landing)/                           # Next.js route group — no URL impact
│   ├── layout.tsx                       # landing-only layout (font vars, container width)
│   ├── page.tsx                         # composes the six sections
│   └── _components/
│       ├── landing-nav.tsx              # sticky wordmark + "Try it free" button
│       ├── hero.tsx                     # headline + subhead + primary CTA
│       ├── demo-video.tsx               # <video autoplay loop muted> + poster + subtle frame
│       ├── features.tsx                 # 4 tiles (multi-provider, vision, spaced repetition, offline/BYOK)
│       ├── how-it-works.tsx             # 3-step horizontal: Upload → Generate → Study
│       ├── faq.tsx                      # 6 items using shadcn Accordion
│       └── footer.tsx                   # tagline, GitHub, copyright, quick links
├── app/
│   ├── page.tsx                         # moved from src/app/page.tsx — hosts <ProjectList />
│   └── project/
│       └── page.tsx                     # moved from src/app/project/page.tsx
└── page.tsx                             # NEW: client redirect stub for ?share=... back-compat
                                         # (the real landing is served by (landing)/page.tsx via route group)

public/
├── demo.mp4                             # ~18-20s silent loop, CRF 23, ≤2MB
├── demo-poster.png                      # first frame, ≤50KB
└── og-image.png                         # 1200×630 social preview, ≤200KB
```

**Important routing note:** Next.js App Router resolves `src/app/page.tsx` AND `src/app/(landing)/page.tsx` as both mapping to `/`. This is a conflict. The correct shape is **one or the other**, not both. We use `src/app/(landing)/page.tsx` as the real landing, and put the `?share=...` redirect logic **inside** that page (not in a separate `src/app/page.tsx` file). The structure diagram above is slightly misleading on this point — see §"Routing decisions" below for the final resolved layout.

### Modified files

| File | Change |
|---|---|
| `src/app/layout.tsx` | Add `og-image` meta tags; no other changes |
| `src/app/project/page.tsx` | **deleted** — moved to `src/app/app/project/page.tsx` |
| `src/components/shared-project-handler.tsx` | `router.push("/project")` → `router.push("/app/project")` |
| `src/components/project-list.tsx` | Add `<Link href="/">` "← Home" in the header next to existing buttons |
| `src/lib/store.ts` | `createShareableLink` template: `/?share=` → `/app?share=` |
| `next.config.ts` | No change needed (no new config) |

### Deleted files

- `src/app/page.tsx` (replaced by `src/app/(landing)/page.tsx`)
- `src/app/project/page.tsx` (moved to `src/app/app/project/page.tsx`)

## Routing decisions (resolved)

**Final layout** — the structure diagram above had a conflict; this is the resolved shape:

```
src/app/
├── layout.tsx                           # root layout — unchanged
├── (landing)/                           # route group
│   ├── layout.tsx                       # landing-specific layout
│   ├── page.tsx                         # THE landing page + ?share= back-compat redirect
│   └── _components/...
├── app/
│   ├── page.tsx                         # project list
│   └── project/
│       └── page.tsx                     # project view
```

- `src/app/page.tsx` does **not exist** — the `(landing)` route group owns `/`.
- The `?share=...` back-compat check lives inside `(landing)/page.tsx`: if `searchParams.get('share')` is present, `useEffect` redirects to `/app?share=${value}` client-side. No server redirect needed.
- Direct navigation to `/app` and `/app/project` resolves to the moved pages.

## Landing page composition

### Nav (`landing-nav.tsx`)
- Sticky top bar, `position: sticky; top: 0`, translucent backdrop-blur.
- Left: wordmark "◇ exam-helper" using Fraunces.
- Right: single `<Link href="/app">` styled as primary button, text "Try it free".

### Hero (`hero.tsx`)
- Headline (Fraunces 48px → 64px at `md`, `font-weight: 400`, tracking -0.015em):
  > Study from your own documents. Retain more.
- Subhead (Inter 16px, muted color, max-width 560px):
  > Upload a PDF. Get flashcards, a structured study guide, and automated notes — generated by the AI model of your choice.
- CTA row: primary "Try it free →" button (ink-black, filled) + secondary ghost "See how it works" (scrolls to `#demo`).
- Subtle decorative diamond + rule line (inspired by the mockup the user picked).
- Entry animation: 400ms fade-up on headline, 200ms delayed fade-up on subhead and CTA row.

### Demo video (`demo-video.tsx`)
- `<video autoplay loop muted playsinline poster="/demo-poster.png">` pointing to `/demo.mp4`.
- Wrapped in a subtle frame (1px off-white border + soft drop shadow).
- Max width 880px, centered, `aspect-ratio: 16 / 9`.
- Under the video, a single caption line: *"Upload a PDF. Switch providers on the fly. Study with spaced repetition."*

### Features (`features.tsx`)
Four tiles, two columns on desktop, one column on mobile. Each tile: small icon (Lucide), H3 title, 1-sentence description.

1. **Bring your own AI.** Gemini, OpenAI, Claude, OpenRouter — pick per feature.
2. **Vision-aware.** Flagship models read your PDF directly, diagrams included.
3. **Spaced repetition.** Cards you struggle with resurface more often.
4. **Runs in your browser.** Your documents and API keys stay on your device.

### How it works (`how-it-works.tsx`)
Three steps, horizontal strip on desktop, stacked on mobile. Each step: large serif numeral (01 / 02 / 03), H3 title, 1-sentence description.

1. **Upload.** Drop a PDF, DOCX, or paste text.
2. **Generate.** Pick a model per feature — flashcards, notes, study guide.
3. **Study.** Spaced-repetition flashcards, structured notes, shareable projects.

### FAQ (`faq.tsx`)
Six items using the existing shadcn Accordion component:

1. **Do I need to pay?** No. Bring your own API key from any of the four providers and use it for free.
2. **Which AI models are supported?** Gemini 2.5 Pro/Flash, GPT-5 and variants, Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5, plus ~300 models via OpenRouter.
3. **Does my data leave my browser?** Only when you generate content — then your PDF text is sent to the AI provider you configured. Projects, settings, and API keys are stored locally via browser storage.
4. **Can I use it offline?** The study session works offline; generation needs internet because it calls the AI provider.
5. **What file types work?** PDF, DOCX, and plain text. PPT support is planned.
6. **Is there a paid tier?** Not yet. A paid plan with hosted models (no API key required) is in development.

### Footer (`footer.tsx`)
- Left: tagline reprise ("Study from your own documents.") + subtle wordmark.
- Right: a small column of quick links — GitHub, `/app`, Privacy (link to a placeholder anchor for now).
- Bottom: `© 2026 exam-helper` + a line separator.

## Demo recording

### Setup (one-time, executed during plan run)
```bash
brew install ffmpeg
pip install playwright
playwright install chromium
cp screen-recorder.skill ~/.claude/skills/
```

### Seeded demo-mode project

To make flashcard generation appear instant in the video, we add a one-time seeding mechanism that runs only when an environment flag is set. This is **dev-only**, gated behind `NEXT_PUBLIC_DEMO_SEED=1`, and never ships to production.

**Implementation:**
- `src/lib/demo-seed.ts` — exports `seedDemoData()` that loads a pre-built project JSON into the Zustand store if the flag is set and no project with id `"demo-intro-to-qc"` already exists.
- The existing root layout calls `seedDemoData()` on mount inside a small client effect if `process.env.NEXT_PUBLIC_DEMO_SEED === "1"`.
- `public/demo-seed.json` — the seeded payload: project name "Introduction to Quantum Computing", pre-computed 5 flashcards with realistic content, a 3-section study guide, and pre-rendered markdown notes.

**During recording:**
- `NEXT_PUBLIC_DEMO_SEED=1 npm run dev` starts the seeded server.
- The Playwright scenario navigates to `/app`, opens the seeded project, clicks Generate — the button-click handler short-circuits on the seeded `processedHashes` and returns the pre-computed cards *visually* via the store's normal flow. No provider call.
- The UI is the real UI; only the data is fast-pathed.

### Recording scenario (JSON consumed by `claude-screen-recorder`)

Saved at `docs/superpowers/specs/demo-scenario.json` during implementation. Steps:
1. Navigate to `http://localhost:3000/app`
2. Wait 500ms (let page settle)
3. Click the "Intro to Quantum Computing" project card
4. Wait 1500ms
5. Click "Generate Flashcards" tab
6. Click "Generate 5 flashcards" button
7. Wait 2000ms (cards animate in)
8. Click the first flashcard
9. Wait 1500ms (flip animation)
10. Click the Settings cog (top right)
11. Click the "Models" tab
12. Click the provider dropdown → select "OpenAI"
13. Click the model dropdown → select "GPT-5"
14. Click the Close button
15. Wait 1500ms
16. Click the "Automated Notes" tab
17. Wait 2500ms (final frame)

Expected total ~18-20s. Viewport: 1280×720.

### Output
- Raw WebM from Playwright → `outputs/recordings/exam-helper-demo.webm`
- `ffmpeg -crf 23` conversion → `outputs/recordings/exam-helper-demo.mp4`
- Poster extraction: `ffmpeg -ss 0 -vframes 1 -f image2 public/demo-poster.png`
- Final copy: `cp outputs/recordings/exam-helper-demo.mp4 public/demo.mp4`

### Size budget
- `demo.mp4` target ≤2MB. If over, lower CRF to 26 or trim the idle wait-times.
- `demo-poster.png` target ≤50KB via `pngquant` or `oxipng`.

### Fallback if recording fails
If `claude-screen-recorder` install breaks on this machine (e.g., ffmpeg brew fails, Python 3.13 incompatibility, WSL-style issues), fall back to **Option C from brainstorming**: a 4-frame screenshot carousel with Framer Motion crossfade. Scripted in the plan as an escape hatch.

## Copy + typography + palette

### Typography (via `next/font/google`)
```ts
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
```

Applied via CSS variables on the landing layout's `<body>` class. The app's `/app/*` routes retain the current Inter-only font stack untouched.

### Palette (CSS custom properties on the landing layout scope)
```css
:root[data-surface="landing"] {
  --canvas: #fafaf7;
  --ink: #111111;
  --muted: #55534e;
  --rule: #e8e3d8;
  --accent: #b8854a;
}
```

### Copy voice
- Plainspoken, precise, confident.
- No superlatives: no "unleash", "revolutionize", "cutting-edge", "game-changing."
- No fake social proof: no logos, no placeholder testimonials.
- Active voice. 12-20 word sentences.

## Validation

### Build-time gates (all exit 0)
1. `npm install` clean. (Fonts load via `next/font/google` — no new package deps.)
2. `npm run build` exits 0. New routes `/`, `/app`, `/app/project` all prerender (or SSR) without error.
3. `npm run lint` exits 0.
4. `npx tsc --noEmit` exits 0.

### Playwright smoke
1. GET `/` → landing renders; hero headline, video element, 4 feature tiles, 3 how-it-works steps, FAQ items all present. 0 console errors.
2. Click "Try it free" in the nav → URL becomes `/app`; project list renders.
3. GET `/app` directly → project list renders; existing behavior intact.
4. GET `/?share=test-payload` → client-side redirects to `/app?share=test-payload` within ≤300ms.
5. GET `/app?share=test-payload` → SharedProjectHandler runs (toast / dialog as implemented).
6. FAQ accordion expand/collapse works.
7. `<video>` element has `autoplay loop muted playsinline` attributes; video file is present and non-empty.

### Lighthouse (manual, not blocking)
- Performance ≥ 90
- Accessibility ≥ 95
- Best practices ≥ 95
- SEO ≥ 95

If the MP4 hurts performance below 90, encode it smaller (CRF 26) or switch to `preload="metadata"` + click-to-play.

### Demo video QA (manual)
- Plays on Safari desktop (Mac), Chrome desktop, Chrome mobile emulation.
- Loops seamlessly — final frame matches first frame tone or a deliberate pause/fade.
- ≤2MB.

### No-go signals
- `claude-screen-recorder` install fails after three resolution attempts → fall back to screenshot carousel (see §"Fallback" above).
- Moving `/project` → `/app/project` surfaces a Next 16 routing issue that requires a backend route → this is out of scope; pause and escalate.

## Rollback

- Branch `feat/landing-page-and-demo` off `main`. Never force-push.
- **Full rollback**: close PR unmerged; zero impact.
- **Partial rollback**: revert individual commits on the branch. Logical commit boundaries:
  - "routing move" (app → /app, shared handler updates)
  - "landing page base"
  - "demo video"
  - "feature + FAQ sections"
  - "OG image + meta"

## Success

1. GET `/` shows the editorial landing with the demo video playing.
2. All existing app flows work at their new `/app/*` paths.
3. Legacy `/?share=...` links redirect correctly.
4. `demo.mp4` loops cleanly, ≤2MB.
5. All four gates green. Playwright smoke passes.
6. Vercel preview URL in the PR description.
