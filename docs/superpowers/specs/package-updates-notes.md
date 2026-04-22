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

| package | before | after | jump |
| --- | --- | --- | --- |
| @google/generative-ai | ^0.24.0 | ^0.24.1 | patch |
| @hookform/resolvers | ^5.0.1 | ^5.2.2 | minor |
| @radix-ui/react-accordion | ^1.2.11 | ^1.2.12 | patch |
| @radix-ui/react-checkbox | ^1.2.3 | ^1.3.3 | minor |
| @radix-ui/react-dialog | ^1.1.11 | ^1.1.15 | patch |
| @radix-ui/react-dropdown-menu | ^2.1.12 | ^2.1.16 | patch |
| @radix-ui/react-label | ^2.1.4 | ^2.1.8 | patch |
| @radix-ui/react-progress | ^1.1.4 | ^1.1.8 | patch |
| @radix-ui/react-separator | ^1.1.4 | ^1.1.8 | patch |
| @radix-ui/react-slot | ^1.2.0 | ^1.2.4 | patch |
| @radix-ui/react-tabs | ^1.1.9 | ^1.1.13 | patch |
| @types/node | ^20 | ^25 | **major** |
| eslint | ^9 | ^10 | **major** |
| eslint-config-next | 15.3.1 | 16.2.4 | **major** |
| lucide-react | ^0.503.0 | ^1.8.0 | **major** |
| mammoth | ^1.9.1 | ^1.12.0 | minor |
| next | ^15.5.9 | ^16.2.4 | **major** |
| pdf-parse | ^1.1.1 | ^2.4.5 | **major** |
| pdfjs-dist | ^5.1.91 | ^5.6.205 | minor |
| react | ^19.0.0 | ^19.2.5 | minor |
| react-dom | ^19.0.0 | ^19.2.5 | minor |
| react-hook-form | ^7.56.1 | ^7.73.1 | minor |
| react-pdf | ^9.2.1 | ^10.4.1 | **major** |
| sonner | ^2.0.3 | ^2.0.7 | patch |
| tailwind-merge | ^3.2.0 | ^3.5.0 | minor |
| tw-animate-css | ^1.2.8 | ^1.4.0 | minor |
| typescript | ^5 | ^6 | **major** |
| zod | ^3.24.3 | ^4.3.6 | **major** |
| zustand | ^5.0.3 | ^5.0.12 | patch |

Totals: **9 majors**, 9 minors, 11 patches (29 bumps).

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
