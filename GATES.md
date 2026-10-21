# Gates: Adaptive revision tutor

OWNS: server/**, web/**, docs/**, .env.example, GATES.md, docker-compose*.yml, README.md

Scope: Implement authenticated, grounded, resumable adaptive practice using one TypeScript ADK agent without modifying flashcard reviews.

- [x] G1: Backend security, grounding and state tests pass
  CHECK: npm test
  EXPECT: fail 0
  CWD: server
  EVIDENCE: automatic-evidence=v1; definition-sha256=4fd1e449095355d6f7b697dec8756ea3322b4a2692688cb9c26751f573368249; exit=0; EXPECT=matched; output-sha256=43b85edae995ec50d1e8462f9372388f84cda2d821baa2b31b16970179f280f5; output-bytes=4567; shell=/bin/sh; cwd=/Users/anas/Documents/GitHub/exam-helper/server; path=b81cab214b23/40 entries

- [x] G2: Backend compiles with installed ADK APIs
  CHECK: npm run build
  EXPECT: tsc
  CWD: server
  EVIDENCE: automatic-evidence=v1; definition-sha256=25ea1ad8c086e512a68d9ea1f3515e010fc7dd0dda632bde56be551f47cf5dc5; exit=0; EXPECT=matched; output-sha256=e1cef534127106a2843c9493be5eda32cc060593ad8a2f230e419f7ead34eeea; output-bytes=41; shell=/bin/sh; cwd=/Users/anas/Documents/GitHub/exam-helper/server; path=b81cab214b23/40 entries

- [x] G3: Frontend type checks
  CHECK: npm run typecheck
  EXPECT: tsc --noEmit
  CWD: web
  EVIDENCE: automatic-evidence=v1; definition-sha256=895245e2b8cfe8f2eb823d98fb6a98cf66461937197e29bbc440c816b7f7ed4f; exit=0; EXPECT=matched; output-sha256=e4fc904a15db16c3950eb62222d5b42980c35578cb918bb496b36d10f43bc0a4; output-bytes=50; shell=/bin/sh; cwd=/Users/anas/Documents/GitHub/exam-helper/web; path=b81cab214b23/40 entries

- [x] G4: Documentation includes setup, architecture, synthetic demo, evaluation and limitations
  EVIDENCE: Reviewed docs/adaptive-practice.md: setup, Mermaid architecture, synthetic biology demo, limits, retention, tests and native ADK evaluation.

- [x] G5: Model evaluation explicitly requires credentials and paid-run authorisation
  EVIDENCE: Ran the evaluation entry point without authorization; it exited 2 before any provider call. Paid model evaluation remains intentionally unrun.
