# Tasks: HTTP Endpoint Fallback for WebSocket Failure

**Input**: Design documents from `/specs/002-http-endpoint-fallback/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included — Constitution Principle VIII requires test-first approach (contract tests, integration tests, unit tests).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Shared Infrastructure)

**Purpose**: Create rate limiter middleware and validation rules that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Create rate limiter middleware in middlewares/rateLimiter.js — sliding window counter per client (userId + endpoint), configurable limit (default 2/sec), returns 429 with Retry-After header, periodic cleanup of stale entries
- [x] T002 [P] Create scoring validation rules in utils/validators/matchValidator.js — express-validator rules for addPoint (playerId required integer, points required integer ≥ 1, roundNumber optional integer 1-3), removePoint (same), endRound (roundNumber optional integer 1-3)
- [x] T003 [P] Create unit tests for rate limiter in tests/unit/rateLimiter.test.js — test sliding window enforcement, 429 response with Retry-After header, cleanup of stale entries, different clients tracked independently

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 2: User Story 1 — HTTP Scoring Endpoints (Priority: P1) 🎯 MVP

**Goal**: MAT_JUDGE can submit scoring actions (add points, remove points, end round) via HTTP POST when WebSocket is unavailable

**Independent Test**: Start a match, submit scoring actions via HTTP POST, verify scores update and MatchEvent records are created; verify non-MAT_JUDGE roles get 403

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] [US1] Create contract tests for scoring endpoints in tests/contract/http-fallback.test.js — test POST /api/matches/:id/points response shape matches contracts/rest-api.md, POST /api/matches/:id/remove-points response shape, POST /api/matches/:id/end-round response shape, error response shapes (401, 403, 404, 409, 422)
- [x] T005 [P] [US1] Create integration tests for HTTP scoring in tests/integration/http-fallback.test.js — test full flow: start match → add points via HTTP → verify score and MatchEvent, remove points → verify, end round → verify; test role enforcement (SCOREKEEPER gets 403); test match not IN_PROGRESS returns 409

### Implementation for User Story 1

- [x] T006 [US1] Add addPoint controller method in Controllers/matchController.js — extract playerId, points, roundNumber from req.body; call scoringService.addPoint(); return successResponse with full match state from matchService.getMatchState()
- [x] T007 [US1] Add removePoint controller method in Controllers/matchController.js — extract playerId, points, roundNumber from req.body; call scoringService.removePoint(); return successResponse with full match state
- [x] T008 [US1] Add endRound controller method in Controllers/matchController.js — extract roundNumber from req.body; call scoringService.endRound(); return successResponse with full match state
- [x] T009 [US1] Register scoring routes in Routes/matchRoutes.js — POST /:id/points with tkdProtect + tkdRoleGuard(MAT_JUDGE) + rateLimiter(2) + matchPointValidation + validate, POST /:id/remove-points with same middleware chain, POST /:id/end-round with tkdProtect + tkdRoleGuard(MAT_JUDGE) + rateLimiter(1) + endRoundValidation + validate

**Checkpoint**: HTTP scoring endpoints fully functional — MAT_JUDGE can score via HTTP, non-MAT_JUDGE gets 403

---

## Phase 3: User Story 2 — HTTP State Polling (Priority: P2)

**Goal**: Clients can poll GET /api/matches/:id to retrieve full match state for HTTP fallback mode

**Independent Test**: Start a match, add points via HTTP, poll GET endpoint, verify full state returned with latest scores and events

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US2] Add contract tests for GET /api/matches/:id polling in tests/contract/http-fallback.test.js — test response shape matches contracts/rest-api.md polling contract, verify full state includes player1, player2, latestEvent, scores, status
- [x] T011 [P] [US2] Add integration tests for HTTP polling in tests/integration/http-fallback.test.js — test poll returns consistent state after scoring actions, test multiple sequential polls return same state when no changes, test poll with rate limit (10/sec for GET)

### Implementation for User Story 2

- [x] T012 [US2] Verify existing GET /api/matches/:id endpoint returns full match state with player associations and latest MatchEvent — update matchController.getById if needed to include club and latestEvent via matchmakingService.getMatchDetail()
- [x] T013 [US2] Add rate limiter (10/sec) to GET /:id route in Routes/matchRoutes.js for polling support

**Checkpoint**: HTTP polling fully functional — clients can poll for match state at 1/sec with 10/sec rate limit

---

## Phase 4: User Story 3 — Rate Limiting & Error Handling (Priority: P3)

**Goal**: System gracefully handles excessive HTTP requests and provides consistent error responses across all endpoints

**Independent Test**: Send requests exceeding rate limit, verify 429 with Retry-After; send invalid input, verify 422 with field errors; verify all error responses match contract shapes

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T014 [P] [US3] Add rate limit integration tests in tests/integration/http-fallback.test.js — test 429 response after exceeding 2/sec limit on POST scoring endpoints, test Retry-After header present, test different clients have independent limits, test 10/sec limit on GET polling endpoint
- [x] T015 [P] [US3] Add error handling tests in tests/integration/http-fallback.test.js — test 401 for missing/bad token, test 403 for wrong role, test 404 for non-existent match, test 409 for match not IN_PROGRESS, test 422 for invalid body (missing playerId, points < 1)

### Implementation for User Story 3

- [x] T016 [US3] Add rate limiter to all scoring POST routes in Routes/matchRoutes.js — apply rateLimiter(2) to /:id/points and /:id/remove-points, apply rateLimiter(1) to /:id/end-round
- [x] T017 [US3] Ensure all error responses match contract shapes in Controllers/matchController.js — verify ApiErrors usage for 401/403/404/409/422 responses matches contracts/rest-api.md error tables

**Checkpoint**: Rate limiting and error handling complete — all endpoints return contract-compliant responses

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, Postman collection, final validation

- [x] T018 [P] Update Postman collection in postman/collection.json — add POST /api/matches/:id/points, POST /api/matches/:id/remove-points, POST /api/matches/:id/end-round requests with bodies, auth, and example responses matching contracts/rest-api.md
- [x] T019 Run quickstart.md validation — execute all quickstart commands manually, verify endpoints work as documented
- [x] T020 Run full test suite — npm test to verify all contract, integration, and unit tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately
- **US1 (Phase 2)**: Depends on Phase 1 (rate limiter + validators)
- **US2 (Phase 3)**: Depends on Phase 1 (rate limiter for GET polling)
- **US3 (Phase 4)**: Depends on Phase 2 and Phase 3 (tests exercise the endpoints)
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 1 — No dependencies on other stories
- **US2 (P2)**: Can start after Phase 1 — No dependencies on US1 (GET endpoint already exists)
- **US3 (P3)**: Depends on US1 and US2 completion (tests exercise their endpoints)

### Within Each User Story

- Tests MUST be written and confirmed to FAIL before implementation (Test-First)
- Controller methods before route registration
- Route registration before integration testing
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T004 and T005 can run in parallel (different test files)
- T010 and T011 can run in parallel (additions to existing test files)
- T014 and T015 can run in parallel (additions to existing test file)
- T018 can run in parallel with T019 (different files)

---

## Parallel Example: User Story 1

```bash
# Launch contract and integration tests together (test-first):
Task: "Create contract tests for scoring endpoints in tests/contract/http-fallback.test.js"
Task: "Create integration tests for HTTP scoring in tests/integration/http-fallback.test.js"

# After tests are written and confirmed to FAIL, launch implementation:
Task: "Add addPoint controller method in Controllers/matchController.js"
Task: "Add removePoint controller method in Controllers/matchController.js"
Task: "Add endRound controller method in Controllers/matchController.js"

# Then register routes (depends on controller methods):
Task: "Register scoring routes in Routes/matchRoutes.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (rate limiter + validators)
2. Complete Phase 2: US1 — HTTP Scoring Endpoints
3. **STOP and VALIDATE**: Run contract tests, integration tests, manual curl tests
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundational → Foundation ready
2. Add US1 (scoring via HTTP) → Test independently → Deploy/Demo (MVP!)
3. Add US2 (polling support) → Test independently → Deploy/Demo
4. Add US3 (rate limiting polish) → Test independently → Deploy/Demo
5. Polish → Postman + docs → Final release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests MUST fail before implementing (Red-Green-Refactor per Constitution Principle VIII)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The existing matchService and scoringService are reused — no changes needed to service layer
