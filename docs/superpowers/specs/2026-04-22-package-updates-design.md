# Package Updates — Design

**Status:** approved (awaiting user spec review)
**Date:** 2026-04-22
**Sub-project:** 1 of 6 (part of the site-wide modernization plan)
**Branch target:** `chore/package-updates`

## Context

The repo is a Next.js 15 + React 19 app ("gen-flashcards" / exam-helper) that generates flashcards from PDFs using the Gemini API. The codebase is roughly a year old and has drifted:

- `package.json` has not been updated since initial scaffolding; many deps are stale.
- `next.config.ts` silences both TypeScript and ESLint errors at build time (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`). The build passing is therefore not a meaningful signal.
- The repo contains a `package-lock.json` (npm) but the README claims pnpm is preferred, and `.github/workflows/nextjs.yml` runs `pnpm i --frozen-lockfile` against a pnpm lockfile that does not exist — so that workflow has been silently broken. Vercel is the real deploy target.

This is the first sub-project in a six-part modernization plan. It exists to establish a trustworthy baseline (up-to-date deps, real type-checking, accurate docs) before larger architectural work lands in subsequent sub-projects.

## Goal

Upgrade every runtime and dev dependency to its latest stable version in a single commit on a feature branch, with TypeScript + ESLint error suppression turned off, and with the app verifiably functional against a manual smoke test.

## Scope

### In scope

- Every dependency in `package.json` (both `dependencies` and `devDependencies`) to latest stable.
- Flip `ignoreBuildErrors` and `ignoreDuringBuilds` to `false` in `next.config.ts`.
- Fix any TS/ESLint errors surfaced by the flags or the upgrades (bounded — see below).
- Update `README.md` to reflect npm as the actual package manager and remove stale pnpm / GitHub Pages instructions.
- Delete `.github/workflows/nextjs.yml` (Vercel is the deploy; the workflow is broken and references a lockfile that does not exist).

### Out of scope

- Migrating `@google/generative-ai` → `@google/genai`. The AI layer will be rewritten in sub-project #2 behind a multi-provider abstraction; migrating here would be thrown away.
- New features, UI polish, landing page, payments.
- Node version bump. Stay on Node 20 unless a package explicitly demands otherwise.
- Fixing pre-existing TS/ESLint errors that are unrelated to the upgraded packages. These are logged in the PR description as a follow-up pass, not fixed here.

## Approach

**Big Bang:** `npm-check-updates -u` everything at once, run the build, fix whatever breaks. One feature branch, one commit on success. If the build produces an unmanageable set of failures (see "no-go signals" below), fall back to the grouped approach (patches+minors → UI majors → framework majors → domain majors) with one commit per group.

Rationale: user preference for speed. The grouped approach is on deck if Big Bang stalls.

### Execution sequence

1. Create branch `chore/package-updates` off `main`.
2. Flip ignore flags off in `next.config.ts` **before** any upgrades. Run `npm run build`. Log the resulting errors as the pre-existing baseline — these are the out-of-scope set.
3. Run `npx npm-check-updates -u` to rewrite `package.json` to latest stable for every dep.
4. `rm -rf node_modules package-lock.json && npm install`. If peer-dep errors block resolution, resolve by pinning the conflicting package back one minor; `--legacy-peer-deps` is acceptable only with a TODO and a logged follow-up.
5. `npm run build`. Capture the first real failure set.
6. Fix build errors in order of the package they point to. Each fix is one of:
   - a codemod (`npx @next/codemod@latest upgrade latest`, `npx types-react-codemod@latest preset-19 src/`)
   - a manual API change (Zod 4 schemas, react-pdf prop names, pdfjs worker path)
   - a targeted `@ts-expect-error` with an explanatory TODO — only if the issue is in an out-of-scope file and blocks the build
7. `npm run lint`. Fix lint errors using the same scope boundary.
8. Manual smoke test in `npm run dev` (see validation section).
9. Delete `.github/workflows/nextjs.yml`.
10. Update `README.md` — replace `pnpm` references with `npm`, remove GitHub Pages instructions.
11. Commit, push, open PR against `main`. PR description lists every major version bump (before → after), every error fixed, every error deferred.

## Known migration risks

### High-confidence breakage

- **Zod 3 → 4.** Renames and removals: `.nonempty()` → `.min(1)`, error-map signature changed, `.deepPartial()` removed, some `.default()` semantics changed. Touches every schema in `src/lib/store.ts` and form validation in `flashcard-generator.tsx`.
- **`pdfjs-dist` 5 → latest + `react-pdf` 9 → latest.** Worker import path and `GlobalWorkerOptions.workerSrc` almost always need updating across majors. Check `src/types/pdf-worker.d.ts` and `src/types/pdf-parse.d.ts` shims.
- **Next 15 → 16.** Async `cookies()`/`headers()`/`params`/`searchParams` should already be async (Next 15 change); the codemod catches any leftovers. Turbopack is now default — verify `next dev --turbopack` still works.
- **TypeScript 5.x bump.** `ignoreBuildErrors: false` will surface whatever has been hiding. Expect `any` leaks, React 19 ref-as-prop changes, and Radix prop drift.

### Medium-confidence breakage

- **ESLint 9 + `eslint-config-next`.** Flat config migration if not already applied. `eslint.config.mjs` exists, so likely already flat — plugin versions will churn.
- **Tailwind v4 point releases.** `tw-animate-css` has coupled versions and may need bumping together.
- **React 19 patch updates.** `forwardRef` deprecation warnings; some Radix versions need to stay in sync.

### Low-confidence (usually fine)

All `@radix-ui/*` packages, `lucide-react`, `sonner`, `class-variance-authority`, `tailwind-merge`, `zustand`, `react-hook-form`, `react-markdown` + remark/rehype plugins, `mammoth`, `pdf-parse`.

### Mitigations

- Run Next and React codemods before any manual fixes.
- Keep a scratch file `docs/superpowers/specs/package-updates-notes.md` during implementation to log every non-trivial fix — contents become the PR description, then the file is deleted before merge.

## Validation

No automated test suite exists. Validation is build + lint + human smoke test.

### Build-time gates (all must pass before merge)

1. `npm install` completes with no peer-dep errors that block resolution.
2. `npm run build` exits 0 with `ignoreBuildErrors: false`.
3. `npm run lint` exits 0 with `ignoreDuringBuilds: false`.
4. `npx tsc --noEmit` exits 0.

### Runtime smoke test

Manual, in `npm run dev`, with browser console open:

1. Load `/` → project list renders, no console errors.
2. Create a new project → redirects to project view.
3. Upload a small PDF (≤5 pages) → text extraction completes, no worker errors.
4. Upload a `.docx` → mammoth extraction works.
5. Enter Gemini API key in settings → saved to zustand store, persists across reload.
6. Generate 5 flashcards → network request succeeds, cards render.
7. Start study session → flashcard flip, mark correct/incorrect, spaced repetition advances.
8. Open notes view → markdown renders (remark-gfm, rehype-raw).
9. Import/export a project → round-trips without data loss.
10. Share-project dialog opens → URL generation works.

A step failing blocks merge unless the failure reproduces on `main` (pre-existing bug, logged but not blocking).

### No-go signals (trigger fallback)

- Build produces >30 errors across >5 packages after one full fix pass.
- A fix requires rewriting >200 LOC in code that intersects with sub-project #2 (e.g., Zod 4 forcing a store-schema rewrite that the AI-layer refactor will also touch).
- Any dependency requires a Node version bump to install.

On any no-go signal: revert to post-step-2 state and re-execute as the grouped approach (patches+minors → UI majors → framework majors → domain majors), one commit per group.

## Rollback

### Mechanics

- Branch is never force-pushed; `main` is untouched.
- **Full rollback:** delete the branch locally, close the PR without merging. Zero impact on production.
- **Partial rollback:** `git revert` the offending commit, or `npm install <package>@<previous-version>` and commit the pin. Update PR description to reflect reduced scope.

### Risk envelope

- **Production risk:** zero until merge. Vercel deploys `main` only.
- **Branch lifespan target:** ≤ 1 working day. A stalled branch more than a couple of days old is abandoned and re-opened with the grouped approach.
- **Worst-case cost:** time. No data migration, no user-facing change, no external service touched.

### Non-goals for rollback

The PR either merges clean or is abandoned. No partial commits to `main`. No "half-upgraded" state preserved.

## Success criteria

1. `npm install` succeeds without blocking peer-dep errors.
2. `npm run build` exits 0 with `ignoreBuildErrors: false`.
3. `npm run lint` exits 0 with `ignoreDuringBuilds: false`.
4. `npx tsc --noEmit` exits 0.
5. All 10 smoke-test steps pass (or failures reproduce on `main` and are logged).
6. `README.md` accurately reflects npm usage; no stale pnpm / GitHub Pages instructions remain.
7. PR merged to `main` with a description that enumerates version bumps, fixes, and deferrals.
