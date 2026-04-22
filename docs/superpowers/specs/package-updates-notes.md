# Package Updates — Execution Notes

Scratch log of every non-trivial fix during the upgrade. Becomes the PR description. Deleted before merge.

## Baseline errors (pre-existing, with ignore flags off, before any upgrades)

All entries below are **pre-existing — deferred** (out-of-scope per spec; not caused by upgrades). Full log at `/tmp/baseline-build.log`.

- Total: **57 ESLint errors, 0 TypeScript errors** (TS compile succeeded; failures are all lint).
- By rule:
  - `@typescript-eslint/no-unused-vars`: 39
  - `@typescript-eslint/no-explicit-any`: 8
  - `react/no-unescaped-entities`: 7
  - `prefer-const`: 2
  - `react-hooks/rules-of-hooks`: 1

### Unique errors (file:line — message)

- src/app/page.tsx:3 — 'useEffect' is defined but never used (no-unused-vars)
- src/app/page.tsx:3 — 'useState' is defined but never used (no-unused-vars)
- src/app/page.tsx:4 — 'useRouter' is defined but never used (no-unused-vars)
- src/components/document-upload.tsx:11 — 'mammoth' is defined but never used (no-unused-vars)
- src/components/document-upload.tsx:29 — 'setPdfContent' is assigned a value but never used (no-unused-vars)
- src/components/flashcard-generator.tsx:3 — 'useEffect' is defined but never used (no-unused-vars)
- src/components/flashcard-generator.tsx:12 — 'Save' is defined but never used (no-unused-vars)
- src/components/flashcard-generator.tsx:13 — 'AlertCircle' is defined but never used (no-unused-vars)
- src/components/flashcard-generator.tsx:14 — 'RotateCw' is defined but never used (no-unused-vars)
- src/components/flashcard-list.tsx:117 — Unexpected any. Specify a different type (no-explicit-any)
- src/components/flashcard-list.tsx:244 — `"` can be escaped (no-unescaped-entities)
- src/components/flashcard-list.tsx:245 — `"` can be escaped (no-unescaped-entities)
- src/components/flashcard-session.tsx:14 — 'BarChart2' is defined but never used (no-unused-vars)
- src/components/flashcard-session.tsx:116 — `'` can be escaped (no-unescaped-entities)
- src/components/flashcard.tsx:6 — 'ThumbsUp' is defined but never used (no-unused-vars)
- src/components/flashcard.tsx:6 — 'ThumbsDown' is defined but never used (no-unused-vars)
- src/components/project-view.tsx:3 — 'useRef' is defined but never used (no-unused-vars)
- src/components/project-view.tsx:30 — 'Settings' is defined but never used (no-unused-vars)
- src/components/project-view.tsx:42 — 'StudyGuide' is defined but never used (no-unused-vars)
- src/components/project-view.tsx:43 — 'FlashcardData' is defined but never used (no-unused-vars)
- src/components/project-view.tsx:100 — 'xp' is assigned a value but never used (no-unused-vars)
- src/components/project-view.tsx:103 — React Hook "useEffect" is called conditionally (rules-of-hooks)
- src/components/project-view.tsx:369 — Unexpected any. Specify a different type (no-explicit-any)
- src/components/project-view.tsx:1145 — 'formattedTranscript' is never reassigned; use const (prefer-const)
- src/components/project-view.tsx:1151 — 'linkedTranscript' is never reassigned; use const (prefer-const)
- src/components/share-project-dialog.tsx:21 — 'ExternalLink' is defined but never used (no-unused-vars)
- src/components/share-project-dialog.tsx:61 — 'error' is defined but never used (no-unused-vars)
- src/components/share-project-dialog.tsx:122 — `'` can be escaped (no-unescaped-entities)
- src/components/shared-project-handler.tsx:126 — `'` can be escaped (no-unescaped-entities)
- src/components/study-content-view.tsx:14 — 'StudySection' is defined but never used (no-unused-vars)
- src/components/study-content-view.tsx:15 — 'StudyTopic' is defined but never used (no-unused-vars)
- src/components/study-content-view.tsx:17 — 'FlashcardData' is defined but never used (no-unused-vars)
- src/components/study-content-view.tsx:45 — 'getDuplicateQuestionCount' is assigned a value but never used (no-unused-vars)
- src/components/study-content-view.tsx:75 — 'areMcqsGeneratedForSource' is assigned a value but never used (no-unused-vars)
- src/components/topic-quiz-view.tsx:83 — `"` can be escaped (no-unescaped-entities) [two instances on same line]
- src/components/video-upload.tsx:9 — 'toast' is defined but never used (no-unused-vars)
- src/lib/ai-service.ts:127 — Unexpected any. Specify a different type (no-explicit-any)
- src/lib/ai-service.ts:303 — 'options' is assigned a value but never used (no-unused-vars)
- src/lib/ai-service.ts:351 — 'response' is assigned a value but never used (no-unused-vars)
- src/lib/ai-service.ts:451 — 'ttsOptions' is assigned a value but never used (no-unused-vars)
- src/lib/ai-service.ts:454 — Unexpected any. Specify a different type (no-explicit-any)
- src/lib/ai-service.ts:648 — 'validationError' is defined but never used (no-unused-vars)
- src/lib/document-service.ts:23 — Unexpected any. Specify a different type (no-explicit-any)
- src/lib/store.ts:5 — 'createShareableProject' is defined but never used (no-unused-vars)
- src/lib/store.ts:5 — 'getSharedProject' is defined but never used (no-unused-vars)
- src/lib/store.ts:696 — 'jsonData' is defined but never used (no-unused-vars) [multiple unused params on lines 696, 703, 706, 712, 720, 721]
- src/lib/store.ts:891 — 'lastStudied' is assigned a value but never used (no-unused-vars)
- src/types/pdf-parse.d.ts:5 — Unexpected any. Specify a different type (no-explicit-any)
- src/types/pdf-parse.d.ts:6 — Unexpected any. Specify a different type (no-explicit-any)
- src/types/pdf-parse.d.ts:14 — Unexpected any. Specify a different type (no-explicit-any)

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
