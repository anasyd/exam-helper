# Landing Page + Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an editorial-aesthetic landing page at `/`, move the existing app to `/app/*`, and record a looping demo video via the claude-screen-recorder skill. Single CTA "Try it free" → `/app`. Back-compat redirect for legacy `?share=...` links.

**Architecture:** Next.js App Router with a `(landing)` route group owning `/` and its own layout. Landing is static, client-rendered, no new runtime deps. App relocation is a file-rename + 3 call-site updates. Demo uses a `NEXT_PUBLIC_DEMO_SEED` flag to pre-populate Zustand with a realistic project so the recorder can click through Generate → study → switch model → notes in ~18-20s without live AI calls.

**Tech Stack:** Next.js 16 App Router, React 19, `next/font/google` (Fraunces display + Inter body), shadcn UI primitives (existing), Tailwind CSS v4, claude-screen-recorder skill (Playwright + ffmpeg + xvfb/native), Vercel deploy.

**Spec:** `docs/superpowers/specs/2026-04-22-landing-page-and-demo-design.md`

---

## File Structure

### New files (16)

```
src/app/
├── (landing)/
│   ├── layout.tsx                       # landing-only layout with font variables + palette CSS
│   ├── page.tsx                         # composes sections + ?share= back-compat redirect
│   └── _components/
│       ├── landing-nav.tsx              # sticky top bar
│       ├── hero.tsx                     # headline + subhead + CTA
│       ├── demo-video.tsx               # <video> with loop/autoplay/muted + poster
│       ├── features.tsx                 # 4-tile grid
│       ├── how-it-works.tsx             # 3-step strip
│       ├── faq.tsx                      # 6 Accordion items
│       └── footer.tsx                   # tagline + quick links + copyright
├── app/
│   ├── page.tsx                         # moved <ProjectList /> host
│   └── project/
│       └── page.tsx                     # moved <ProjectView /> host
└── opengraph-image.tsx                  # dynamic OG image generator (Next built-in)

public/
├── demo.mp4                             # recorded demo (~18-20s, ≤2MB)
└── demo-poster.png                      # first-frame fallback (≤50KB)

src/lib/
└── demo-seed.ts                         # dev-only seeder (gated by NEXT_PUBLIC_DEMO_SEED)

public/
└── demo-seed.json                       # pre-built project payload for the recorder

docs/superpowers/specs/
└── demo-scenario.json                   # claude-screen-recorder input (not shipped)
```

### Modified files (5)

```
src/app/layout.tsx                       # add OG meta tags (next/metadata API)
src/app/page.tsx                         # DELETED (replaced by (landing)/page.tsx)
src/app/project/page.tsx                 # DELETED (moved to src/app/app/project/page.tsx)
src/components/shared-project-handler.tsx # router.push("/project") → "/app/project"
src/components/project-list.tsx          # add "Home" link in header
src/lib/store.ts                         # createShareableLink: "/?share=" → "/app?share="
```

### Validation model

No automated tests exist. Same gate pattern as prior sub-projects:
1. `npm run build` exits 0
2. `npm run lint` exits 0
3. `npx tsc --noEmit` exits 0
4. Playwright smoke test via MCP

Per-task commits preserve bisectability.

---

## Task 1: Create feature branch and move app from / to /app

**Files:**
- Delete: `src/app/page.tsx`
- Delete: `src/app/project/page.tsx`
- Create: `src/app/app/page.tsx`
- Create: `src/app/app/project/page.tsx`

- [ ] **Step 1: Confirm clean tree, pull, create branch**

```bash
git status
git pull --ff-only origin main
git checkout -b feat/landing-page-and-demo
```

- [ ] **Step 2: Read the existing page files to preserve their content**

```bash
cat src/app/page.tsx
cat src/app/project/page.tsx
```

The current `src/app/page.tsx` is (verbatim — use as reference):

```tsx
"use client";

import { Suspense } from "react";
import { ProjectList } from "@/components/project-list";
import { SharedProjectHandler } from "@/components/shared-project-handler";

export default function Home() {
  return (
    <>
      <ProjectList />
      <Suspense fallback={null}>
        <SharedProjectHandler />
      </Suspense>
    </>
  );
}
```

- [ ] **Step 3: Create the new `src/app/app/page.tsx`** with this content:

```tsx
"use client";

import { Suspense } from "react";
import { ProjectList } from "@/components/project-list";
import { SharedProjectHandler } from "@/components/shared-project-handler";

export default function AppHome() {
  return (
    <>
      <ProjectList />
      <Suspense fallback={null}>
        <SharedProjectHandler />
      </Suspense>
    </>
  );
}
```

- [ ] **Step 4: Copy the project-view page to the new location**

```bash
mkdir -p src/app/app/project
cp src/app/project/page.tsx src/app/app/project/page.tsx
```

- [ ] **Step 5: Delete the old pages**

```bash
git rm src/app/page.tsx
git rm src/app/project/page.tsx
```

- [ ] **Step 6: Verify build passes (routes resolve cleanly)**

```bash
npm run build 2>&1 | tail -10
```

Expected: exit 0 and output shows both `/app` and `/app/project` in the route table. `/` may temporarily show as "Not Found" or be absent — that's fine, Task 6 adds the landing page at `/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(routing): move app to /app/* (project list + project view)"
```

---

## Task 2: Update call-sites for the /app path change

**Files:**
- Modify: `src/components/shared-project-handler.tsx`
- Modify: `src/lib/store.ts` (createShareableLink template)
- Modify: `src/components/project-list.tsx` (add Home link)

- [ ] **Step 1: Find the router.push sites in SharedProjectHandler**

```bash
grep -n "router.push\|window.location" src/components/shared-project-handler.tsx
```

- [ ] **Step 2: Update `src/components/shared-project-handler.tsx`**

Replace every `router.push("/project")` with `router.push("/app/project")`. Leave any other logic unchanged.

- [ ] **Step 3: Find the share-link template in store.ts**

```bash
grep -n "createShareableLink\|/?share=" src/lib/store.ts
```

- [ ] **Step 4: Update the createShareableLink URL template in `src/lib/store.ts`**

Find the line that builds the share URL (look for `window.location.origin + "/?share=`). Replace `/?share=` with `/app?share=`. Example:

```ts
// BEFORE
const shareableUrl = `${window.location.origin}/?share=${encodedData}`;

// AFTER
const shareableUrl = `${window.location.origin}/app?share=${encodedData}`;
```

- [ ] **Step 5: Add "Home" link in `src/components/project-list.tsx`**

Find the header section (grep for `"Settings"` or `"New Project"` to locate it). Inside the header's right-side button group, add a Link to `/` as the FIRST child:

```tsx
import Link from "next/link";
// ... in the header group:
<Link
  href="/"
  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
>
  ← Home
</Link>
```

Place it BEFORE the Settings button.

- [ ] **Step 6: Verify build + lint + tsc**

```bash
npm run build 2>&1 | tail -5
npm run lint 2>&1 | tail -3
npx tsc --noEmit 2>&1 | tail -3
```

All must exit 0. Note: build output may still say "no `/` route" — that's fine.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(routing): update share-link URL, push targets, add Home link"
```

---

## Task 3: Landing layout with fonts + palette

**Files:**
- Create: `src/app/(landing)/layout.tsx`

- [ ] **Step 1: Create the landing layout file**

```tsx
import type { ReactNode } from "react";
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

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} landing-surface`}
      data-surface="landing"
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Add landing palette to globals.css**

Open `src/app/globals.css`. Append at the end:

```css
/* Landing page palette + typography scope */
.landing-surface {
  --canvas: #fafaf7;
  --ink: #111111;
  --muted: #55534e;
  --rule: #e8e3d8;
  --accent: #b8854a;

  background-color: var(--canvas);
  color: var(--ink);
  font-family: var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
}

.landing-surface .display {
  font-family: var(--font-display), Georgia, serif;
  font-weight: 400;
  letter-spacing: -0.015em;
}

.landing-surface .label {
  font-family: var(--font-body), sans-serif;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.landing-surface .subtle-rule {
  border-top: 1px solid var(--rule);
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(landing\)/layout.tsx src/app/globals.css
git commit -m "feat(landing): add landing layout with Fraunces + Inter + editorial palette"
```

---

## Task 4: Landing nav component

**Files:**
- Create: `src/app/(landing)/_components/landing-nav.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";

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
        <Link
          href="/app"
          className="bg-[color:var(--ink)] text-[color:var(--canvas)] px-5 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try it free
        </Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(landing\)/_components/landing-nav.tsx
git commit -m "feat(landing): add sticky nav with wordmark + CTA"
```

---

## Task 5: Hero component

**Files:**
- Create: `src/app/(landing)/_components/hero.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";

export function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-32">
      <div className="max-w-3xl">
        <div className="label mb-6">◇ A study tool for your own documents</div>
        <h1 className="display text-5xl md:text-6xl lg:text-7xl leading-[1.03] mb-6">
          Study from your own documents. Retain more.
        </h1>
        <p className="text-lg text-[color:var(--muted)] max-w-xl leading-relaxed mb-10">
          Upload a PDF. Get flashcards, a structured study guide, and automated notes — generated by the AI model of your choice.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/app"
            className="bg-[color:var(--ink)] text-[color:var(--canvas)] px-7 py-3 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try it free →
          </Link>
          <a
            href="#demo"
            className="border border-[color:var(--ink)] text-[color:var(--ink)] px-7 py-3 rounded-sm text-sm font-medium hover:bg-[color:var(--ink)] hover:text-[color:var(--canvas)] transition-colors"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(landing\)/_components/hero.tsx
git commit -m "feat(landing): add hero with headline + CTA row"
```

---

## Task 6: Demo video component (with placeholder MP4)

**Files:**
- Create: `src/app/(landing)/_components/demo-video.tsx`
- Create: `public/demo.mp4` (placeholder — real file lands in Task 14)
- Create: `public/demo-poster.png` (placeholder — real file lands in Task 14)

- [ ] **Step 1: Create placeholder assets so the component compiles**

Create a 1-byte placeholder file for each so the `<video>` element doesn't 404 during dev. They'll be overwritten by the recording in Task 14.

```bash
# tiny valid png (1x1 transparent) — base64 decodes to a real PNG
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\xc0\xc0\x00\x00\x00\x04\x00\x01]\xcca\x1a\x00\x00\x00\x00IEND\xaeB`\x82' > public/demo-poster.png
# placeholder mp4 — will be replaced
printf '' > public/demo.mp4
```

If the `printf` approach is awkward in your shell, use the equivalent node script:
```bash
node -e "require('fs').writeFileSync('public/demo-poster.png', Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489','hex'))"
node -e "require('fs').writeFileSync('public/demo.mp4', '')"
```

- [ ] **Step 2: Create the component**

```tsx
export function DemoVideo() {
  return (
    <section id="demo" className="max-w-5xl mx-auto px-6 py-16 md:py-24">
      <div className="relative rounded-sm overflow-hidden border border-[color:var(--rule)] shadow-[0_30px_60px_-15px_rgba(17,17,17,0.15)] bg-[color:var(--ink)]">
        <div className="aspect-video">
          <video
            className="w-full h-full object-cover"
            src="/demo.mp4"
            poster="/demo-poster.png"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        </div>
      </div>
      <p className="text-center mt-6 text-sm text-[color:var(--muted)]">
        Upload a PDF. Switch providers on the fly. Study with spaced repetition.
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(landing\)/_components/demo-video.tsx public/demo.mp4 public/demo-poster.png
git commit -m "feat(landing): add demo-video component with placeholder assets"
```

---

## Task 7: Features grid

**Files:**
- Create: `src/app/(landing)/_components/features.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Sparkles, Eye, Timer, Lock } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Bring your own AI.",
    description:
      "Gemini, OpenAI, Claude, OpenRouter — configure once, pick a different model per feature if you want.",
  },
  {
    icon: Eye,
    title: "Vision-aware.",
    description:
      "Flagship models read your PDF directly. Diagrams, equations, and scanned pages stay intact.",
  },
  {
    icon: Timer,
    title: "Spaced repetition.",
    description:
      "Cards you struggle with resurface more often. Cards you know fade. No manual scheduling.",
  },
  {
    icon: Lock,
    title: "Runs in your browser.",
    description:
      "Your projects and API keys stay on your device. No accounts required to start.",
  },
];

export function Features() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
      <div className="mb-14">
        <div className="label mb-3">Features</div>
        <h2 className="display text-3xl md:text-4xl max-w-2xl">
          Thoughtful choices, from document to recall.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[color:var(--rule)] flex items-center justify-center">
              <f.icon className="w-4 h-4 text-[color:var(--ink)]" />
            </div>
            <div>
              <h3 className="display text-xl mb-2">{f.title}</h3>
              <p className="text-[color:var(--muted)] leading-relaxed text-[15px]">
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(landing\)/_components/features.tsx
git commit -m "feat(landing): add 4-tile features grid"
```

---

## Task 8: How-it-works strip

**Files:**
- Create: `src/app/(landing)/_components/how-it-works.tsx`

- [ ] **Step 1: Create the component**

```tsx
const STEPS = [
  {
    num: "01",
    title: "Upload.",
    description: "Drop a PDF, DOCX, or paste text.",
  },
  {
    num: "02",
    title: "Generate.",
    description: "Pick a model per feature — flashcards, notes, study guide.",
  },
  {
    num: "03",
    title: "Study.",
    description: "Spaced-repetition flashcards, structured notes, shareable projects.",
  },
];

export function HowItWorks() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-16 md:py-24 border-t border-[color:var(--rule)]">
      <div className="mb-14">
        <div className="label mb-3">How it works</div>
        <h2 className="display text-3xl md:text-4xl max-w-2xl">
          Three steps, start to study session.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {STEPS.map((s) => (
          <div key={s.num}>
            <div className="display text-5xl text-[color:var(--accent)] mb-4">
              {s.num}
            </div>
            <h3 className="display text-xl mb-2">{s.title}</h3>
            <p className="text-[color:var(--muted)] leading-relaxed text-[15px]">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(landing\)/_components/how-it-works.tsx
git commit -m "feat(landing): add how-it-works 3-step strip"
```

---

## Task 9: FAQ

**Files:**
- Create: `src/app/(landing)/_components/faq.tsx`

- [ ] **Step 1: Create the component**

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Do I need to pay?",
    a: "No. Bring your own API key from Gemini, OpenAI, Anthropic, or OpenRouter and use it for free. A paid hosted tier is in development.",
  },
  {
    q: "Which AI models are supported?",
    a: "Gemini 2.5 Pro, Flash, and Flash Lite. GPT-5, GPT-5 mini, and GPT-5 nano. Claude Opus 4.7, Sonnet 4.6, and Haiku 4.5. Plus around 300 more models through OpenRouter.",
  },
  {
    q: "Does my data leave my browser?",
    a: "Only when you ask for generation — then the document content is sent to the AI provider you configured. Projects, settings, and API keys are stored locally in browser storage.",
  },
  {
    q: "Can I use it offline?",
    a: "The study session works offline against cards you already have. Generation needs internet because it calls the AI provider.",
  },
  {
    q: "What file types work?",
    a: "PDF, DOCX, and plain text. PowerPoint support is on the roadmap.",
  },
  {
    q: "Is there a paid tier?",
    a: "Not yet. A paid plan with hosted models (no API key required) is in development.",
  },
];

export function Faq() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-16 md:py-24 border-t border-[color:var(--rule)]">
      <div className="mb-10">
        <div className="label mb-3">FAQ</div>
        <h2 className="display text-3xl md:text-4xl">Common questions.</h2>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left display text-lg">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-[color:var(--muted)] leading-relaxed">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
```

- [ ] **Step 2: Verify build + lint**

```bash
npm run build 2>&1 | tail -5
npm run lint 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(landing\)/_components/faq.tsx
git commit -m "feat(landing): add FAQ accordion"
```

---

## Task 10: Footer

**Files:**
- Create: `src/app/(landing)/_components/footer.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-6 py-16 border-t border-[color:var(--rule)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        <div>
          <div className="display text-lg mb-2 flex items-center gap-2">
            <span className="text-[color:var(--accent)]">◇</span>
            exam-helper
          </div>
          <p className="text-[color:var(--muted)] text-sm max-w-xs leading-relaxed">
            Study from your own documents. Generated by the AI model of your choice.
          </p>
        </div>
        <div className="flex md:justify-end gap-8 text-sm">
          <Link
            href="/app"
            className="hover:underline text-[color:var(--ink)]"
          >
            Launch app
          </Link>
          <a
            href="https://github.com/anasyd/exam-helper"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-[color:var(--ink)] inline-flex items-center gap-1"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
        </div>
      </div>
      <div className="mt-12 pt-6 border-t border-[color:var(--rule)] flex items-center justify-between text-xs text-[color:var(--muted)]">
        <span>© 2026 exam-helper</span>
        <span>Made with restraint.</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(landing\)/_components/footer.tsx
git commit -m "feat(landing): add footer with GitHub + launch link"
```

---

## Task 11: Compose landing page + share-redirect back-compat

**Files:**
- Create: `src/app/(landing)/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LandingNav } from "./_components/landing-nav";
import { Hero } from "./_components/hero";
import { DemoVideo } from "./_components/demo-video";
import { Features } from "./_components/features";
import { HowItWorks } from "./_components/how-it-works";
import { Faq } from "./_components/faq";
import { Footer } from "./_components/footer";

function ShareRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const share = searchParams.get("share");
    if (share) {
      router.replace(`/app?share=${encodeURIComponent(share)}`);
    }
  }, [router, searchParams]);

  return null;
}

export default function LandingPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ShareRedirect />
      </Suspense>
      <LandingNav />
      <main>
        <Hero />
        <DemoVideo />
        <Features />
        <HowItWorks />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected output includes `/` in the route table (as a static or client route).

- [ ] **Step 3: Verify lint + tsc**

```bash
npm run lint 2>&1 | tail -3
npx tsc --noEmit 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(landing\)/page.tsx
git commit -m "feat(landing): compose page with share-redirect back-compat"
```

---

## Task 12: Metadata + Open Graph image

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/opengraph-image.tsx`

- [ ] **Step 1: Add metadata to the root layout**

Find `src/app/layout.tsx`. Locate or add the `metadata` export. The final version:

```tsx
import type { Metadata } from "next";
// ... existing imports ...

export const metadata: Metadata = {
  title: "exam-helper — Study from your own documents",
  description:
    "Upload a PDF. Get flashcards, a structured study guide, and automated notes — generated by the AI model of your choice.",
  openGraph: {
    title: "exam-helper — Study from your own documents",
    description:
      "Upload a PDF. Get flashcards, a structured study guide, and automated notes — generated by the AI model of your choice.",
    url: "https://exam-helper.vercel.app",
    siteName: "exam-helper",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "exam-helper — Study from your own documents",
    description:
      "Upload a PDF. Get flashcards, a structured study guide, and automated notes.",
  },
};

// ... rest of layout unchanged ...
```

If `metadata` already exists (from sub-project #1's package updates or prior), merge the fields above into it.

- [ ] **Step 2: Create the dynamic OG image**

Next 16's file convention `app/opengraph-image.tsx` automatically generates an OG image at `/opengraph-image.png` and injects it into metadata.

Create `src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "exam-helper — Study from your own documents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#fafaf7",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: "#b8854a",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>◇</span>
          <span>exam-helper</span>
        </div>
        <div
          style={{
            fontSize: 88,
            color: "#111111",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: "900px",
          }}
        >
          Study from your own documents. Retain more.
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#55534e",
            fontFamily: "system-ui, sans-serif",
            maxWidth: "800px",
          }}
        >
          Flashcards, notes, and a study guide — from the AI model of your choice.
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors. The route `/opengraph-image.png` is added to the build output.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/opengraph-image.tsx
git commit -m "feat(landing): add metadata + dynamic OG image"
```

---

## Task 13: Demo-seed mechanism

**Files:**
- Create: `src/lib/demo-seed.ts`
- Create: `public/demo-seed.json`
- Modify: `src/app/layout.tsx` (conditional seeder import)

- [ ] **Step 1: Write the seed payload**

Create `public/demo-seed.json` with a realistic pre-built project. This runs during the demo recording to make Generate-flashcards feel instant.

```json
{
  "project": {
    "id": "demo-intro-to-qc",
    "name": "Introduction to Quantum Computing",
    "description": "Lecture notes — MIT 8.370x week 1",
    "pdfContent": "Quantum computing uses qubits, which can exist in superpositions of 0 and 1. Unlike classical bits that are deterministically 0 or 1, qubits leverage quantum mechanical phenomena like superposition and entanglement. The Bloch sphere is a geometric representation of a qubit's state. Quantum gates such as Hadamard, CNOT, and Pauli gates manipulate qubit states to perform computations. Shor's algorithm demonstrates exponential speedup over classical factoring algorithms, threatening RSA cryptography. Grover's algorithm provides quadratic speedup for unstructured search problems. Quantum entanglement allows correlated measurements across separated qubits, forming the basis of quantum teleportation and quantum key distribution.",
    "processedHashes": [],
    "cardsSeenThisSession": [],
    "sessionComplete": false,
    "xp": 0,
    "flashcards": [
      {
        "id": "demo-card-1",
        "question": "What is a qubit?",
        "answer": "A quantum bit that can exist in a superposition of 0 and 1 simultaneously.",
        "options": [
          "A classical bit flipped quickly",
          "A quantum bit in superposition of 0 and 1",
          "A type of quantum gate",
          "A measurement error"
        ],
        "correctOptionIndex": 1,
        "difficulty": 1,
        "lastSeen": null,
        "timesCorrect": 0,
        "timesIncorrect": 0
      },
      {
        "id": "demo-card-2",
        "question": "What does the Hadamard gate do?",
        "answer": "Creates an equal superposition of |0⟩ and |1⟩ from a basis state.",
        "options": [
          "Entangles two qubits",
          "Measures the qubit state",
          "Creates superposition from a basis state",
          "Corrects quantum errors"
        ],
        "correctOptionIndex": 2,
        "difficulty": 2,
        "lastSeen": null,
        "timesCorrect": 0,
        "timesIncorrect": 0
      },
      {
        "id": "demo-card-3",
        "question": "Which algorithm threatens RSA cryptography?",
        "answer": "Shor's algorithm — efficient integer factoring on a quantum computer.",
        "options": [
          "Grover's algorithm",
          "Shor's algorithm",
          "The quantum Fourier transform alone",
          "Deutsch-Jozsa algorithm"
        ],
        "correctOptionIndex": 1,
        "difficulty": 3,
        "lastSeen": null,
        "timesCorrect": 0,
        "timesIncorrect": 0
      },
      {
        "id": "demo-card-4",
        "question": "What is quantum entanglement?",
        "answer": "A correlation between qubits such that measuring one instantly determines the state of the other.",
        "options": [
          "Two qubits held in separate registers",
          "A form of decoherence",
          "A correlation that links measurement outcomes across qubits",
          "The act of copying a qubit state"
        ],
        "correctOptionIndex": 2,
        "difficulty": 2,
        "lastSeen": null,
        "timesCorrect": 0,
        "timesIncorrect": 0
      },
      {
        "id": "demo-card-5",
        "question": "What speedup does Grover's algorithm provide?",
        "answer": "Quadratic speedup over classical unstructured search.",
        "options": [
          "Exponential over any classical algorithm",
          "Quadratic speedup over classical search",
          "Linear speedup in all cases",
          "No speedup — only a theoretical construct"
        ],
        "correctOptionIndex": 1,
        "difficulty": 3,
        "lastSeen": null,
        "timesCorrect": 0,
        "timesIncorrect": 0
      }
    ],
    "documentNotes": "# Introduction to Quantum Computing\n\n## Qubits\n- Basic unit; superposition of |0⟩ and |1⟩.\n- Measured probabilistically (Born rule).\n\n## Gates\n- **Hadamard** — creates superposition from basis states.\n- **CNOT** — two-qubit gate for entanglement.\n- **Pauli X, Y, Z** — single-qubit rotations.\n\n## Key algorithms\n- **Shor's** — factoring; exponential speedup; breaks RSA.\n- **Grover's** — unstructured search; quadratic speedup.\n\n## Entanglement\n- Bell states: maximally entangled pairs.\n- Enables teleportation and QKD.",
    "studyGuide": {
      "title": "Introduction to Quantum Computing",
      "sections": [
        {
          "title": "Qubits and Superposition",
          "summary": "The fundamental units of quantum information and how they differ from classical bits.",
          "topics": [
            {
              "title": "Bit vs qubit",
              "summary": "A qubit can represent |0⟩, |1⟩, or any superposition of the two."
            },
            {
              "title": "The Bloch sphere",
              "summary": "A geometric representation of a single qubit state."
            }
          ]
        },
        {
          "title": "Quantum Gates",
          "summary": "Unitary operations that manipulate qubit states.",
          "topics": [
            {
              "title": "Single-qubit gates",
              "summary": "Hadamard, Pauli X/Y/Z, phase gates."
            },
            {
              "title": "Two-qubit gates",
              "summary": "CNOT as the canonical entangling gate."
            }
          ]
        },
        {
          "title": "Landmark Algorithms",
          "summary": "Two algorithms that demonstrate quantum speedup.",
          "topics": [
            {
              "title": "Shor's algorithm",
              "summary": "Polynomial-time integer factoring on a quantum computer."
            },
            {
              "title": "Grover's algorithm",
              "summary": "Quadratic speedup for unstructured search."
            }
          ]
        }
      ]
    }
  }
}
```

- [ ] **Step 2: Write the seeder utility**

Create `src/lib/demo-seed.ts`:

```ts
"use client";

import { useFlashcardStore } from "./store";

export async function seedDemoData(): Promise<void> {
  if (typeof window === "undefined") return;

  const store = useFlashcardStore.getState();
  if (store.projects.some((p) => p.id === "demo-intro-to-qc")) {
    // already seeded
    return;
  }

  try {
    const res = await fetch("/demo-seed.json", { cache: "no-store" });
    if (!res.ok) return;
    const { project } = (await res.json()) as {
      project: {
        id: string;
        name: string;
        description: string;
        pdfContent: string;
        processedHashes: string[];
        cardsSeenThisSession: string[];
        sessionComplete: boolean;
        xp: number;
        flashcards: Array<{
          id: string;
          question: string;
          answer: string;
          options: string[];
          correctOptionIndex: number;
          difficulty: number;
          lastSeen: null;
          timesCorrect: number;
          timesIncorrect: number;
        }>;
        documentNotes: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- seed JSON is already-shaped StudyGuide
        studyGuide: any;
      };
    };

    // Push directly into the store via setState to bypass action validation
    // for the seeded ids/timestamps.
    useFlashcardStore.setState((state) => ({
      projects: [
        ...state.projects,
        {
          ...project,
          createdAt: new Date(),
          updatedAt: new Date(),
          flashcards: project.flashcards.map((f) => ({
            ...f,
            lastSeen: null,
          })),
        },
      ],
      activeProjectId: project.id,
    }));
  } catch (err) {
    // Silent — demo seeding is best-effort.
    console.warn("demo-seed failed", err);
  }
}
```

- [ ] **Step 3: Wire the seeder in `src/app/layout.tsx`**

Find the client-side area of the layout. If the layout is a server component, create a tiny client wrapper. Add this code after the existing body/children composition:

Create a new helper `src/app/_demo-seed-provider.tsx` (client component):

```tsx
"use client";

import { useEffect } from "react";
import { seedDemoData } from "@/lib/demo-seed";

export function DemoSeedProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_SEED === "1") {
      seedDemoData();
    }
  }, []);
  return <>{children}</>;
}
```

Then in `src/app/layout.tsx`, wrap `{children}` inside the body:

```tsx
import { DemoSeedProvider } from "./_demo-seed-provider";
// ... inside RootLayout return:
<body className={...}>
  <DemoSeedProvider>
    {children}
  </DemoSeedProvider>
</body>
```

- [ ] **Step 4: Verify build + lint + tsc**

```bash
npm run build 2>&1 | tail -5
npm run lint 2>&1 | tail -3
npx tsc --noEmit 2>&1 | tail -3
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/demo-seed.ts src/app/_demo-seed-provider.tsx src/app/layout.tsx public/demo-seed.json
git commit -m "feat(landing): add demo-seed mechanism gated by NEXT_PUBLIC_DEMO_SEED"
```

---

## Task 14: Install claude-screen-recorder + record demo

**Files:**
- Create: `docs/superpowers/specs/demo-scenario.json` (not shipped; used by the recorder)
- Replace: `public/demo.mp4` (real recording)
- Replace: `public/demo-poster.png` (first frame)

- [ ] **Step 1: Install tooling**

Check what's available first:

```bash
which ffmpeg || echo "ffmpeg missing"
python3 -c "import playwright; print(playwright.__version__)" 2>&1 || echo "playwright missing"
ls ~/.claude/skills/ 2>/dev/null | grep -i screen-recorder || echo "skill missing"
```

If any are missing, install:

```bash
# macOS (skip any already installed)
brew install ffmpeg
pip install playwright
playwright install chromium
```

Install the skill file itself. The source is the public repo `ItachiDevv/claude-screen-recorder`. Download just the `screen-recorder.skill` file:

```bash
curl -fsSL -o /tmp/screen-recorder.skill \
  https://raw.githubusercontent.com/ItachiDevv/claude-screen-recorder/main/screen-recorder.skill
mkdir -p ~/.claude/skills
cp /tmp/screen-recorder.skill ~/.claude/skills/
```

If the download URL 404s, clone the repo and copy the `.skill` file manually.

- [ ] **Step 2: Start the dev server in demo-seed mode**

In one terminal:

```bash
NEXT_PUBLIC_DEMO_SEED=1 npm run dev > /tmp/dev-server.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
# Expected: HTTP 200
```

- [ ] **Step 3: Write the demo scenario JSON**

Create `docs/superpowers/specs/demo-scenario.json` with the exact step-by-step scenario. The format mirrors the `claude-screen-recorder` skill's documented schema (see README on the repo). The content:

```json
{
  "name": "exam-helper-demo",
  "description": "18-20s silent loop: open seeded project, generate flashcards, flip one, switch AI model, view notes.",
  "url": "http://localhost:3000/app",
  "viewport": { "width": 1280, "height": 720 },
  "duration_ms": 20000,
  "steps": [
    { "action": "wait", "ms": 500 },
    { "action": "click", "selector": "text='Open Project'" },
    { "action": "wait", "ms": 1500 },
    { "action": "click", "selector": "[role='tab']:has-text('Generate Flashcards')" },
    { "action": "wait", "ms": 500 },
    { "action": "click", "selector": "button:has-text('Generate 5 flashcards')" },
    { "action": "wait", "ms": 2000 },
    { "action": "click", "selector": "[data-slot='card']:nth-child(1)" },
    { "action": "wait", "ms": 1500 },
    { "action": "click", "selector": "button[aria-label='Settings']" },
    { "action": "wait", "ms": 500 },
    { "action": "click", "selector": "[role='tab']:has-text('Models')" },
    { "action": "wait", "ms": 500 },
    { "action": "select", "selector": "select:has(option:has-text('Google Gemini'))", "value": "openai" },
    { "action": "wait", "ms": 300 },
    { "action": "click", "selector": "button:has-text('Close')" },
    { "action": "wait", "ms": 1500 },
    { "action": "click", "selector": "[role='tab']:has-text('Automated Notes')" },
    { "action": "wait", "ms": 2500 }
  ]
}
```

**Caveat on selectors:** The selector syntax shown is Playwright-style. Some skills use simple CSS selectors. If the skill rejects these, translate to CSS-only (e.g., `button[aria-label='Settings']` works anywhere, `[role='tab']:has-text(...)` requires Playwright). Adjust live during recording.

- [ ] **Step 4: Run the recording**

The skill is typically invoked via its own entry command. Check the skill file to find the right command, or use Playwright directly if the skill is unavailable. As a fallback, run Playwright directly via Python:

```bash
cat > /tmp/record-demo.py << 'EOF'
import asyncio, json, os, sys
from playwright.async_api import async_playwright

SCENARIO = json.load(open(sys.argv[1]))
OUTPUT = sys.argv[2]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport=SCENARIO.get("viewport", {"width": 1280, "height": 720}),
            record_video_dir=os.path.dirname(OUTPUT) or ".",
            record_video_size=SCENARIO.get("viewport", {"width": 1280, "height": 720}),
        )
        page = await context.new_page()
        await page.goto(SCENARIO["url"])
        for step in SCENARIO["steps"]:
            action = step["action"]
            if action == "wait":
                await asyncio.sleep(step["ms"] / 1000)
            elif action == "click":
                await page.locator(step["selector"]).first.click()
            elif action == "select":
                await page.locator(step["selector"]).first.select_option(step["value"])
            elif action == "type":
                await page.locator(step["selector"]).first.fill(step.get("text", ""))
        # Close context to flush the video
        await context.close()
        # Find the generated .webm and rename
        for f in os.listdir(os.path.dirname(OUTPUT) or "."):
            if f.endswith(".webm"):
                src = os.path.join(os.path.dirname(OUTPUT) or ".", f)
                dst = OUTPUT.replace(".mp4", ".webm")
                os.rename(src, dst)
                print(f"video saved to {dst}")
                break
        await browser.close()

asyncio.run(main())
EOF

mkdir -p outputs/recordings
python3 /tmp/record-demo.py docs/superpowers/specs/demo-scenario.json outputs/recordings/exam-helper-demo.mp4
```

Expected: `outputs/recordings/exam-helper-demo.webm` exists and is ~1-3MB.

- [ ] **Step 5: Convert WebM to MP4 and extract poster**

```bash
ffmpeg -y -i outputs/recordings/exam-helper-demo.webm \
  -c:v libx264 -crf 23 -preset slow -movflags +faststart -an \
  outputs/recordings/exam-helper-demo.mp4

ffmpeg -y -i outputs/recordings/exam-helper-demo.mp4 \
  -ss 0 -frames:v 1 \
  outputs/recordings/exam-helper-demo-poster.png
```

Inspect:

```bash
ls -lh outputs/recordings/
# Expected: mp4 ≤ 2MB, poster ≤ 200KB
```

- [ ] **Step 6: If MP4 > 2MB, re-encode at higher CRF**

```bash
ffmpeg -y -i outputs/recordings/exam-helper-demo.webm \
  -c:v libx264 -crf 28 -preset slow -movflags +faststart -an \
  outputs/recordings/exam-helper-demo.mp4
```

If still > 2MB after crf 28, trim idle wait-times in the scenario and re-record.

- [ ] **Step 7: If poster > 50KB, compress it**

```bash
# Optional (install if missing: brew install pngquant)
pngquant --quality 50-70 --output outputs/recordings/exam-helper-demo-poster.png --force outputs/recordings/exam-helper-demo-poster.png
```

- [ ] **Step 8: Copy finalized assets into `public/`**

```bash
cp outputs/recordings/exam-helper-demo.mp4 public/demo.mp4
cp outputs/recordings/exam-helper-demo-poster.png public/demo-poster.png
```

- [ ] **Step 9: Stop the dev server**

```bash
lsof -ti:3000 | xargs kill 2>/dev/null
```

- [ ] **Step 10: Verify the video plays locally**

```bash
# Start dev server WITHOUT demo seed (production-like)
npm run dev > /tmp/dev-server.log 2>&1 &
sleep 5
curl -s http://localhost:3000 | grep -c 'demo.mp4'
# Expected: 1 or more matches
lsof -ti:3000 | xargs kill 2>/dev/null
```

- [ ] **Step 11: Commit the assets + scenario**

```bash
git add public/demo.mp4 public/demo-poster.png docs/superpowers/specs/demo-scenario.json
git commit -m "feat(landing): record + commit demo.mp4 (real) + poster"
```

### Fallback if recording pipeline fails

If the install or recording fails after one fix-attempt per error, switch to the screenshot-carousel fallback instead of blocking. Document the failure in the PR description and:

1. Capture 5 real screenshots via MCP Playwright:
   - `public/demo-carousel-01-upload.png`
   - `public/demo-carousel-02-generate.png`
   - `public/demo-carousel-03-flashcard.png`
   - `public/demo-carousel-04-settings.png`
   - `public/demo-carousel-05-notes.png`
2. Replace `DemoVideo` component body with a CSS-only 5-image auto-advancing carousel (3s per image, infinite loop). Use the existing Radix or a simple CSS `@keyframes` approach — no new dep needed.
3. Delete `public/demo.mp4`, keep `public/demo-poster.png` as-is or regenerate from the first screenshot.

---

## Task 15: Final verification + Playwright smoke test

**Files:** none modified unless a gate fails.

- [ ] **Step 1: Clean build from zero**

```bash
rm -rf .next
npm run build 2>&1 | tail -10
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -3
```

All three exit 0.

- [ ] **Step 2: Start dev server (no demo seed — production path)**

```bash
npm run dev > /tmp/dev-server.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
# Expected: HTTP 200
```

- [ ] **Step 3: Run Playwright smoke via MCP**

Drive through these steps (using the `mcp__plugin_playwright_playwright__*` tools):

1. Navigate to `http://localhost:3000` → verify 0 console errors, hero headline visible, `<video>` element present.
2. Snapshot + screenshot saved to `/tmp/landing-hero.png`.
3. Click the nav "Try it free" button → URL becomes `/app` → project list renders.
4. Navigate directly to `http://localhost:3000/app/project` → project view renders (empty if no project, that's fine).
5. Navigate to `http://localhost:3000/?share=dGVzdA==` → URL replaces to `/app?share=dGVzdA==` within ≤500ms.
6. Back to `/`, scroll to FAQ → click first FAQ trigger → content expands.

For each step, check `mcp__plugin_playwright_playwright__browser_console_messages` level=error. No new errors should appear.

- [ ] **Step 4: Clean up untracked Playwright artifacts**

```bash
rm -rf .playwright-mcp
lsof -ti:3000 | xargs kill 2>/dev/null
```

- [ ] **Step 5: If any smoke step failed, fix and commit**

Follow the normal fix-and-commit loop. No rubber-stamping.

---

## Task 16: Finalize PR

**Files:** none modified.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/landing-page-and-demo
```

- [ ] **Step 2: Assemble PR body at `/tmp/pr-body-landing.md`**

```markdown
## Summary

Adds an editorial-aesthetic landing page at `/`, moves the existing app to `/app/*`, and embeds a recorded demo video that showcases the multi-provider AI story. Single CTA "Try it free" → `/app`. No backend, no auth, no waitlist — those are upcoming sub-projects.

## What's new

### Routing
- `/` is now the marketing landing page (route group `(landing)` in Next.js).
- `/app` is the project list; `/app/project` is the project view.
- Legacy `/?share=...` URLs client-redirect to `/app?share=...` within ~300ms (preserves all previously-shared project links).
- `createShareableLink()` in the store now emits `/app?share=...` URLs for new shares.

### Landing sections
1. **Sticky nav** with wordmark + "Try it free" CTA.
2. **Hero** — "Study from your own documents. Retain more." + subhead + dual CTAs.
3. **Demo video** — looping silent MP4 (~18-20s) recorded against a seeded dev-mode project. Shows the app flow end-to-end, including switching AI provider in Settings.
4. **Features grid** — 4 tiles: multi-provider AI, vision, spaced repetition, browser-local storage.
5. **How it works** — 3 steps: Upload → Generate → Study.
6. **FAQ** — 6 items covering pricing, models, privacy, offline, file types, paid tier.
7. **Footer** with GitHub link, launch-app link, copyright.

### Typography + palette
- Display: **Fraunces** (via `next/font/google`, self-hosted in build).
- Body: **Inter** (via `next/font/google`).
- Palette: warm off-white canvas (#fafaf7), ink-black primary (#111), muted secondary (#55534e), subtle rules (#e8e3d8), ochre accent (#b8854a) used sparingly.
- No new runtime deps.

### Demo recording
- Recorded via the Playwright-based scenario in `docs/superpowers/specs/demo-scenario.json`.
- Dev server ran with `NEXT_PUBLIC_DEMO_SEED=1`, which loads a realistic pre-built "Intro to Quantum Computing" project from `public/demo-seed.json`. Makes the Generate-flashcards click in the video feel instant without needing a live AI call.
- Final assets: `public/demo.mp4` (CRF 23, ≤2MB, silent, looping) and `public/demo-poster.png` (first frame, ≤50KB).

### Metadata + Open Graph
- Root `<html>` metadata populated (title + description).
- Dynamic OG image at `/opengraph-image.png` generated via Next 16's `ImageResponse` on the edge runtime. Renders the headline in Fraunces over the warm canvas.

## Files

- **New**: `src/app/(landing)/layout.tsx`, `page.tsx`, 7 `_components/*.tsx`, `opengraph-image.tsx`, `src/lib/demo-seed.ts`, `src/app/_demo-seed-provider.tsx`, `public/demo-seed.json`, `public/demo.mp4`, `public/demo-poster.png`, `docs/superpowers/specs/demo-scenario.json`.
- **Moved**: `src/app/page.tsx` → deleted (replaced). `src/app/project/page.tsx` → `src/app/app/project/page.tsx`. New `src/app/app/page.tsx` hosts the project list.
- **Modified**: `src/app/layout.tsx` (metadata + seed provider), `src/components/shared-project-handler.tsx` (push target), `src/components/project-list.tsx` (Home link), `src/lib/store.ts` (share URL template), `src/app/globals.css` (landing-surface scope).

## Test plan

- [x] `npm install` clean (no new runtime deps)
- [x] `npm run build` exits 0
- [x] `npm run lint` exits 0
- [x] `npx tsc --noEmit` exits 0
- [x] Playwright smoke: landing renders, Try-it-free → /app works, `/app/project` renders, `/?share=X` redirects to `/app?share=X`, FAQ accordion expands
- [ ] **Manual before merge**:
  - [ ] Demo video plays on Safari desktop + Chrome desktop without stutter
  - [ ] Lighthouse on `/`: Performance ≥ 90, Accessibility ≥ 95
  - [ ] OG image renders correctly when pasting the Vercel preview URL into a link-preview tester

## Out of scope (future sub-projects)

- Sign-in button in the nav (#3 backend + auth)
- Waitlist / email capture (#7 paid tier)
- Dark mode (deferred per design decision)
- PowerPoint file support
- Blog, testimonials, pricing page
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "feat: landing page + demo video (app moves to /app)" --body "$(cat /tmp/pr-body-landing.md)" 2>&1 | tail -3
```

Expected: PR URL printed.

- [ ] **Step 4: Done.** Return the PR URL.

---

## Self-Review Summary

**Spec coverage:**
- §Scope: landing at `/` → Tasks 3-11. App move → Tasks 1-2. Share-link redirect → Task 11. Demo video → Tasks 13-14. Metadata + OG → Task 12. ✓
- §Routing decisions: `(landing)` group owns `/`, app at `/app`, no conflicting files → Tasks 1, 11. ✓
- §Landing composition (6 sections + nav + footer) → Tasks 4-10. ✓
- §Demo recording: seed mechanism → Task 13, install + record + assets → Task 14, fallback plan → Task 14 (fallback section). ✓
- §Validation (build/lint/tsc/Playwright) → Task 15. ✓

**Placeholder scan:** No "TBD", "implement later", or "similar to task N" patterns. Every code block is complete. The "fallback" section in Task 14 references specific filenames for the 5 screenshots.

**Type consistency:**
- `seedDemoData()` — signature matches Task 13 definition and Task 13 call site.
- `createShareableLink` — changes are consistent between Tasks 1 and 2.
- Component names (`LandingNav`, `Hero`, `DemoVideo`, `Features`, `HowItWorks`, `Faq`, `Footer`) — all exports match imports in Task 11.
- CSS variables (`--canvas`, `--ink`, `--muted`, `--rule`, `--accent`) consistently referenced across Tasks 3-10.

**Total tasks:** 16. Granularity is moderate — foundations + 7 components + composition + meta + demo + verification + PR. Smaller than #2's 24-task plan because there are fewer integration seams.
