# Package Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade every dependency in `package.json` to latest stable on branch `chore/package-updates`, with TypeScript + ESLint suppression turned off in `next.config.ts`, and the app verifiably functional against a manual smoke test.

**Architecture:** Big Bang — `npm-check-updates -u` everything at once, run codemods, fix build/lint errors, validate. Single feature branch, single PR. Fall back to grouped commits only if the Big Bang produces an unmanageable failure set.

**Tech Stack:** npm, Next.js, React, TypeScript, ESLint, Tailwind, Radix UI, Zustand, react-pdf, pdfjs-dist, Gemini SDK, `npm-check-updates`, `@next/codemod`, `types-react-codemod`.

**Spec:** `docs/superpowers/specs/2026-04-22-package-updates-design.md`

---

## File Structure

**Files modified or touched:**
- `next.config.ts` — flip `ignoreBuildErrors` and `ignoreDuringBuilds` to `false`
- `package.json` — all dependencies bumped to latest stable
- `package-lock.json` — regenerated from a clean install
- `README.md` — correct `pnpm` references to `npm`, remove GitHub Pages instructions
- `.github/workflows/nextjs.yml` — **deleted** (broken, references nonexistent pnpm lockfile; Vercel is the real deploy)

**Files likely to need code fixes** (based on where upgraded packages are actually used — confirm during execution):
- `src/lib/document-service.ts` — imports `pdfjs-dist`, sets `GlobalWorkerOptions.workerSrc` via `new URL("pdfjs-dist/build/pdf.worker.mjs", ...)`. Worker path changes across pdfjs majors.
- `src/types/pdf-worker.d.ts` and `src/types/pdf-parse.d.ts` — ambient module shims; may need regenerating if official types shipped.
- `src/lib/ai-service.ts` — imports `@google/generative-ai`. Out of scope per spec (sub-project #2 rewrites this), but a version bump may still force minor type adjustments.
- Any file that newly fails typecheck after `ignoreBuildErrors: false` flips.

**Files confirmed NOT to need Zod migration:** no file in `src/` imports `zod` directly (only `@hookform/resolvers` consumes it as a peer). Zod 3 → 4 risk is therefore minimal — verify during build, do not pre-emptively rewrite schemas.

**Scratch file during execution (deleted before merge):**
- `docs/superpowers/specs/package-updates-notes.md` — running log of every non-trivial fix; contents become the PR description.

---

## Task 1: Set up the feature branch and baseline

**Files:**
- No code changes in this task. Creates the branch and captures baseline state.

- [ ] **Step 1: Confirm working tree is clean on `main`**

Run:
```bash
git status
git branch --show-current
```
Expected: `working tree clean`, branch `main`. If not clean, stash or abort.

- [ ] **Step 2: Pull latest `main`**

Run:
```bash
git pull --ff-only origin main
```

- [ ] **Step 3: Create and switch to the feature branch**

Run:
```bash
git checkout -b chore/package-updates
```

- [ ] **Step 4: Create the scratchpad for fix notes**

Create `docs/superpowers/specs/package-updates-notes.md` with this content:

```markdown
# Package Updates — Execution Notes

Scratch log of every non-trivial fix during the upgrade. Becomes the PR description. Deleted before merge.

## Baseline errors (pre-existing, with ignore flags off, before any upgrades)
_populated by Task 2_

## Version bumps (before → after)
_populated by Task 3_

## Peer-dep resolution issues
_populated by Task 4_

## Build error fixes
_populated by Task 6_

## Lint fixes
_populated by Task 7_

## Smoke-test findings
_populated by Task 9_

## Deferred / out-of-scope items
_populated throughout_
```

- [ ] **Step 5: Commit the scratchpad + branch setup**

```bash
git add docs/superpowers/specs/package-updates-notes.md
git commit -m "chore: start package-updates branch, add execution scratchpad"
```

---

## Task 2: Flip ignore flags and capture the pre-existing error baseline

**Files:**
- Modify: `next.config.ts`
- Modify: `docs/superpowers/specs/package-updates-notes.md` (append baseline log)

- [ ] **Step 1: Edit `next.config.ts` to turn off both ignore flags**

Change the config block so both flags are `false`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        url: false,
        stream: false,
        crypto: false,
        zlib: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 2: Run the build against current (unchanged) deps**

Run:
```bash
npm install
npm run build 2>&1 | tee /tmp/baseline-build.log
```

Expected: Either clean (unlikely) or a list of TS/ESLint errors. **These are pre-existing errors, not caused by upgrades. They are the out-of-scope set per the spec.**

- [ ] **Step 3: Summarize the baseline errors into the scratchpad**

Under `## Baseline errors` in `docs/superpowers/specs/package-updates-notes.md`, paste:
- Total error count
- One line per unique error (file:line + 1-line message)
- Mark each as "pre-existing — deferred" so the PR reviewer sees them as not introduced by this work.

- [ ] **Step 4: Commit the flag flip + baseline log**

```bash
git add next.config.ts docs/superpowers/specs/package-updates-notes.md
git commit -m "chore: disable TS/ESLint ignore flags and log baseline errors"
```

---

## Task 3: Bump every dependency to latest stable

**Files:**
- Modify: `package.json`
- Modify: `docs/superpowers/specs/package-updates-notes.md` (append version diff)

- [ ] **Step 1: Snapshot the current `package.json`**

Run:
```bash
cp package.json /tmp/package.before.json
```

- [ ] **Step 2: Run `npm-check-updates` to rewrite `package.json`**

Run:
```bash
npx npm-check-updates@latest -u
```

Expected: a diff printed to stdout, `package.json` rewritten with every dep at the latest stable version.

- [ ] **Step 3: Compute and log the version diff into the scratchpad**

Run:
```bash
diff /tmp/package.before.json package.json | tee /tmp/version-diff.txt
```

Under `## Version bumps` in the scratchpad, paste a markdown table with columns: `package | before | after | semver jump (patch/minor/major)`. Flag each **major** jump — those are the ones that deserve PR-reviewer attention.

- [ ] **Step 4: Commit the version bumps (lockfile comes in Task 4)**

```bash
git add package.json docs/superpowers/specs/package-updates-notes.md
git commit -m "chore: bump all deps to latest stable (package.json only)"
```

---

## Task 4: Regenerate the lockfile with a fresh install

**Files:**
- Delete + regenerate: `package-lock.json`
- Delete + regenerate: `node_modules/`
- Modify: `docs/superpowers/specs/package-updates-notes.md` (append peer-dep issues)

- [ ] **Step 1: Wipe `node_modules` and the lockfile**

Run:
```bash
rm -rf node_modules package-lock.json
```

- [ ] **Step 2: Fresh install**

Run:
```bash
npm install 2>&1 | tee /tmp/install.log
```

Expected: install completes, new `package-lock.json` generated. **Do not use `--legacy-peer-deps` on this first attempt.**

- [ ] **Step 3: If install failed with peer-dep errors, resolve them**

Triage options, in order of preference:
1. **Pin one package back a minor.** Find the offending dep in `/tmp/install.log`, edit `package.json` to pin it to a known-compatible version, rerun `npm install`.
2. **Use `--legacy-peer-deps` only as a last resort.** Log it in the scratchpad under `## Peer-dep resolution issues` with a TODO and the reason — this is a deferred follow-up.

- [ ] **Step 4: Log any peer-dep resolutions**

Under `## Peer-dep resolution issues` in the scratchpad, list each resolution with: package name, what conflict, what fix applied.

- [ ] **Step 5: Commit the new lockfile**

```bash
git add package-lock.json package.json docs/superpowers/specs/package-updates-notes.md
git commit -m "chore: regenerate package-lock.json with upgraded deps"
```

---

## Task 5: Run codemods for Next.js and React

**Files:**
- Whatever the codemods touch (review their diffs before committing).
- Modify: `docs/superpowers/specs/package-updates-notes.md` (log what the codemods changed)

- [ ] **Step 1: Run the Next.js codemod**

Run:
```bash
npx @next/codemod@latest upgrade latest
```

The tool is interactive. When prompted:
- Accept the latest Next version (should match what was installed in Task 3–4).
- Apply all offered transforms. Typical Next 15 → 16 transforms: async request APIs, metadata type imports, font loader import paths.

Expected: a summary of files changed.

- [ ] **Step 2: Review the Next codemod diff**

Run:
```bash
git diff
```

Skim every changed file. If any change looks wrong (e.g., introduces an `await` in a non-async function), revert just that file with `git checkout -- path/to/file` and note it in the scratchpad as a manual fix needed in Task 6.

- [ ] **Step 3: Run the React 19 types codemod**

Run:
```bash
npx types-react-codemod@latest preset-19 src/
```

This applies `@types/react` v19-compatible transforms (e.g., `ReactElement` prop typing, implicit-children removal).

- [ ] **Step 4: Review the React codemod diff**

Run:
```bash
git diff
```

Same triage as Step 2. Revert any file where the transform looks wrong.

- [ ] **Step 5: Log codemod output to the scratchpad**

Under a new subsection `## Codemod results` in the scratchpad: list which codemods ran, which files were modified, any reverts.

- [ ] **Step 6: Commit codemod changes**

```bash
git add -A
git commit -m "chore: apply Next.js and React 19 codemods"
```

---

## Task 6: Make the build pass (iterative)

**Files:**
- Whatever files the errors point to. Most likely suspects:
  - `src/lib/document-service.ts` (pdfjs worker path)
  - `src/types/pdf-worker.d.ts`, `src/types/pdf-parse.d.ts` (ambient module shims)
  - Any file consuming `@radix-ui/*` props that changed
  - Any file using React 19 features where types tightened
- Modify: `docs/superpowers/specs/package-updates-notes.md` (log each fix)

This task is a loop, not a linear script. Plan on 3–6 iterations.

- [ ] **Step 1: Run the build and capture output**

Run:
```bash
npm run build 2>&1 | tee /tmp/build-N.log
```
(Replace `N` with the iteration number so logs survive.)

- [ ] **Step 2: Classify the top error**

Read `/tmp/build-N.log` and find the first error that stops the build. Classify it:

| Kind | Example | Fix |
|---|---|---|
| Upgrade-caused API change | `react-pdf` prop renamed, `pdfjs-dist` worker path moved | Rewrite the call site to the new API |
| Type tightening from TS 5.x / `@types/react` 19 | `Property 'X' does not exist on type 'Y'` where Y is a prop from a Radix component | Adjust the type or the usage — do not silence unless it's out of scope |
| Pre-existing baseline error (from Task 2 log) | matches baseline log | **Defer.** Add `// @ts-expect-error — pre-existing, deferred to follow-up` with a clear comment. Log in scratchpad. |
| Peer-dep missing | `Cannot find module 'X'` | Means `npm install` didn't actually install it. Investigate the lockfile. |

- [ ] **Step 3: Apply the fix and re-run the build**

Fix the error, then rerun:
```bash
npm run build 2>&1 | tee /tmp/build-N+1.log
```

- [ ] **Step 4: Log the fix into the scratchpad**

Under `## Build error fixes` append: `- file:line — error — fix applied`.

- [ ] **Step 5: Loop steps 1–4 until the build passes**

Each iteration should reduce the error count. If after three iterations error count is **not** decreasing, or total errors exceed **30 across >5 packages**, this is a no-go signal (see Task 14 — fallback plan).

- [ ] **Step 6: Commit the build fixes**

```bash
git add -A
git commit -m "chore: fix build errors surfaced by dependency upgrades"
```

### Specific fixes to expect

These are fixes with high prior probability — resolve them first when they appear:

**A. `pdfjs-dist` worker path (`src/lib/document-service.ts` line ~8)**

If the build errors with `Cannot find module 'pdfjs-dist/build/pdf.worker.mjs'`, check the installed pdfjs-dist package's `package.json` `exports` field:

```bash
cat node_modules/pdfjs-dist/package.json | grep -A 20 '"exports"'
```

Replace the worker import to match the current export path. Likely new value (verify against the installed package):

```ts
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
```

Update `src/types/pdf-worker.d.ts` to `declare module 'pdfjs-dist/build/pdf.worker.min.mjs' { const src: string; export default src; }` if that's the new entry.

**B. `pdf-parse` types regression**

If `pdf-parse` now ships its own types, delete `src/types/pdf-parse.d.ts` (it's a shim). If the shim is still needed, re-export from the new types location.

**C. Radix UI prop drift**

Radix often tightens prop types. Fix at the call site — do not widen Radix types. Typical pattern: a `ref` prop now expects `Ref<T>` where a component was passing `MutableRefObject<T>`.

**D. `React.ReactElement` / implicit children**

React 19 `@types/react` removes implicit `children`. Any component typed `React.FC<Props>` that expects children but doesn't declare them will fail — add `children?: React.ReactNode` to the Props type.

---

## Task 7: Make the linter pass (iterative)

**Files:**
- Whatever files lint flags. Modify: `docs/superpowers/specs/package-updates-notes.md` (log fixes).

- [ ] **Step 1: Run the linter**

Run:
```bash
npm run lint 2>&1 | tee /tmp/lint.log
```

- [ ] **Step 2: Triage errors using the same classification as Task 6**

Upgrade-caused lint errors: fix them. Pre-existing baseline lint errors: defer with `// eslint-disable-next-line <rule> -- pre-existing, deferred` and log.

**Do NOT add a blanket `// eslint-disable-next-line` at the top of files.** Disables must target a specific rule at a specific line.

- [ ] **Step 3: Re-run lint and iterate until clean**

Run:
```bash
npm run lint
```
Expected: exits 0.

- [ ] **Step 4: Log lint fixes into the scratchpad**

Under `## Lint fixes` append each fix with file:line and rule name.

- [ ] **Step 5: Commit lint fixes**

```bash
git add -A
git commit -m "chore: fix lint errors surfaced by upgraded eslint config"
```

---

## Task 8: Final typecheck gate

**Files:** none modified in this task (unless `tsc` catches something the Next build missed).

- [ ] **Step 1: Run the standalone typechecker**

Run:
```bash
npx tsc --noEmit 2>&1 | tee /tmp/tsc.log
```

Expected: exits 0. Next's build sometimes masks errors in excluded paths — this is the belt-and-braces check.

- [ ] **Step 2: If errors appear, loop back to Task 6**

Apply the same triage. Fix, log, re-run.

- [ ] **Step 3: If fixes were needed, commit them**

```bash
git add -A
git commit -m "chore: fix remaining type errors found by standalone tsc"
```

---

## Task 9: Manual smoke test

**Files:** none modified (unless the smoke test surfaces bugs requiring fixes — see Step 11).

- [ ] **Step 1: Start the dev server**

Run:
```bash
npm run dev
```

Expected: server starts on `localhost:3000`, no startup errors in the terminal.

- [ ] **Step 2: Open the app with DevTools Console visible**

Navigate to `http://localhost:3000`. Open browser DevTools → Console tab. Keep it visible for every step below.

- [ ] **Step 3: Run the smoke test in order**

Execute each step. For each, record in the scratchpad under `## Smoke-test findings`: PASS / FAIL / PASS-WITH-NOISE (console warnings but feature works).

1. **Load `/`** — project list renders. No red errors in console.
2. **Create a new project** — click create, fill name, submit. Redirects to project view.
3. **Upload a small PDF (≤5 pages)** — text extraction completes. No pdfjs worker errors.
4. **Upload a `.docx`** — mammoth extracts text.
5. **Enter Gemini API key in settings** — open settings dialog, paste key, save. Reload the page. Key should persist (zustand storage).
6. **Generate 5 flashcards** — click generate with a valid key. Network request succeeds, cards render.
7. **Start study session** — flip flashcards, mark correct/incorrect. Spaced repetition advances.
8. **Open notes view** — markdown renders with GFM (tables, checkboxes) and raw HTML if used.
9. **Import/export a project** — export JSON, clear, re-import. Verify data round-trips.
10. **Share-project dialog** — opens, generates a URL.

- [ ] **Step 4: Differentiate regressions from pre-existing bugs**

For any FAIL, check out `main` in a second worktree (or `git stash; git checkout main`) and repeat the failing step. If it fails on `main` too, it's **pre-existing, not blocking this PR** — log it as a follow-up. If it only fails on this branch, it's a regression caused by the upgrades and **blocks merge**.

- [ ] **Step 5: Fix any regressions**

For each regression, follow Task 6's triage loop. Commit each fix:

```bash
git add -A
git commit -m "fix: <specific-regression-description>"
```

- [ ] **Step 6: Stop the dev server**

`Ctrl+C` in the terminal.

---

## Task 10: Clean up stale infra files

**Files:**
- Delete: `.github/workflows/nextjs.yml`

- [ ] **Step 1: Delete the broken GH Actions workflow**

Run:
```bash
git rm .github/workflows/nextjs.yml
```

Rationale (for the commit message): the workflow runs `pnpm i --frozen-lockfile` against a pnpm lockfile that does not exist in the repo, and deploys to GitHub Pages, which is not the production target (Vercel is). It has been silently broken and serves no purpose.

- [ ] **Step 2: Check if the `.github/workflows/` directory is now empty**

Run:
```bash
ls .github/workflows/ 2>/dev/null | wc -l
```

If it prints `0`, also remove the empty directory:
```bash
rmdir .github/workflows 2>/dev/null
rmdir .github 2>/dev/null || true
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove broken GitHub Pages workflow (Vercel is the real deploy)"
```

---

## Task 11: Update the README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Correct the package manager references**

Edit `README.md` — in the `Prerequisites`, `Installation`, and any `Getting Started` sections, replace every `pnpm` reference with `npm`:

- `pnpm install` → `npm install`
- `pnpm dev` → `npm run dev`
- `- pnpm (preferred) or npm` → `- npm`

- [ ] **Step 2: Remove any GitHub Pages deployment instructions**

If the README mentions GitHub Pages deployment, delete that section. Vercel is the real deploy; the README does not need deploy instructions (Vercel's own docs cover it). If there is no GH Pages section, skip this step.

- [ ] **Step 3: Sanity check the README renders**

Visually skim the file for dangling references or broken markdown. Fix anything obviously wrong.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README to match actual npm + Vercel workflow"
```

---

## Task 12: Final verification gate before PR

**Files:** none modified unless a gate fails.

- [ ] **Step 1: Rerun all build-time gates in a clean state**

Run:
```bash
rm -rf node_modules .next
npm install
npm run build
npm run lint
npx tsc --noEmit
```

Expected: every command exits 0.

- [ ] **Step 2: Rerun the smoke test (Task 9)**

Condensed pass — hit every step once more since earlier fixes may have shifted behavior.

- [ ] **Step 3: If any gate fails, return to the relevant task**

No rubber-stamping. A green build is the deliverable.

---

## Task 13: Finalize PR

**Files:**
- Delete: `docs/superpowers/specs/package-updates-notes.md` (scratchpad — its contents become the PR description)

- [ ] **Step 1: Assemble the PR description from the scratchpad**

Copy the contents of `docs/superpowers/specs/package-updates-notes.md` into a new file `/tmp/pr-body.md`. Reorganize under these PR headings:

```markdown
## Summary
- Upgraded every dependency to latest stable
- Turned off `ignoreBuildErrors` and `ignoreDuringBuilds` — builds now type-check and lint for real
- Deleted broken `.github/workflows/nextjs.yml`
- Updated README to match actual npm + Vercel workflow

## Version bumps
<table from scratchpad>

## Fixes applied
<build + lint + smoke-test fixes, grouped>

## Deferred / follow-up items
<peer-dep resolutions, pre-existing baseline errors, any regressions that reproduce on main>

## Test plan
- [ ] `npm install` clean
- [ ] `npm run build` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] Smoke test 10/10 pass (or documented as pre-existing)
```

- [ ] **Step 2: Delete the scratchpad**

Run:
```bash
git rm docs/superpowers/specs/package-updates-notes.md
git commit -m "chore: remove execution scratchpad (content in PR description)"
```

- [ ] **Step 3: Push the branch**

Run:
```bash
git push -u origin chore/package-updates
```

- [ ] **Step 4: Open the PR**

Run:
```bash
gh pr create --title "chore: upgrade all dependencies to latest stable" --body "$(cat /tmp/pr-body.md)"
```

Expected: `gh` prints a PR URL. Capture it in the final task output.

---

## Task 14: Fallback plan (only if Task 6 hits a no-go signal)

**Trigger:** During Task 6, after one full iteration of build → fix → build, **any** of:
- Total errors > 30 across > 5 distinct packages
- A single fix requires > 200 LOC of code changes in files that intersect with `src/lib/ai-service.ts` (the AI layer sub-project #2 will rewrite)
- A dep requires a Node version bump

- [ ] **Step 1: Announce the fallback**

Update scratchpad: `## Big Bang aborted — switching to grouped approach. Reason: <one-line reason>`.

- [ ] **Step 2: Reset to post-Task-2 state**

Run:
```bash
git log --oneline
# Find the commit hash of Task 2 (ignore-flags flip)
git reset --hard <task-2-commit-hash>
rm -rf node_modules package-lock.json
npm install
```

- [ ] **Step 3: Re-do upgrades in four grouped commits**

For each group below: edit `package.json` (manually; do not use `ncu` for the whole thing), run `npm install`, run `npm run build`, fix errors, commit.

1. **Patches + minors** of everything (use `ncu -u --target minor`, then revert majors).
2. **UI/utility majors:** `lucide-react`, `sonner`, `@hookform/resolvers`, `tailwind-merge`, `tw-animate-css`, `class-variance-authority`, `zustand`, `react-markdown`, `rehype-raw`, `remark-gfm`, all `@radix-ui/*`.
3. **Framework majors:** `next`, `react`, `react-dom`, `eslint`, `eslint-config-next`, `typescript`.
4. **Domain-heavy majors:** `zod`, `react-pdf`, `pdfjs-dist`, `mammoth`, `pdf-parse`, `@types/pdfjs-dist`.

Each group: one commit on success before starting the next.

- [ ] **Step 4: Resume from Task 7 onward once all four groups are committed**

---

## Self-Review Summary

**Spec coverage:** every in-scope item from the spec has a task:
- Upgrade every dep → Task 3–4
- Flip ignore flags → Task 2
- Fix errors the flags surface → Task 6–7
- Update README → Task 11
- Delete broken workflow → Task 10
- Manual smoke test → Task 9
- Fallback to grouped → Task 14

**Out-of-scope items:** correctly not touched by any task — `@google/generative-ai` migration, new features, Node bump, pre-existing baseline error fixes.

**Placeholder scan:** zero placeholders. Every step has either a concrete command, a concrete code edit, or a concrete classification rule. Open-ended iteration (Tasks 6, 7, 9) has explicit termination conditions and fallback triggers, which is the right structure for work whose error set we can't know in advance.

**Tooling dependencies called out:** `npm-check-updates` (via `npx`), `@next/codemod` (via `npx`), `types-react-codemod` (via `npx`), `gh` CLI. All available on the user's machine per session context.
