---
description: "Task list for Bracket Progression Flow feature implementation"
---

# Tasks: Bracket Progression Flow

**Input**: Design documents from `/specs/004-bracket-progression-flow/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included per the constitution's test-first requirement (Principle VIII).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema updates that all user stories depend on

- [X] T001 Add `seed` field to Player model in Models/Player.js
- [X] T002 [P] Add `nextMatchId` field (FK → Match) to Match model in Models/Match.js
- [X] T003 [P] Add `nextMatchSlot` field (ENUM PLAYER1/PLAYER2) to Match model in Models/Match.js
- [X] T004 [P] Add `stageName` field (STRING) to Match model in Models/Match.js
- [X] T005 [P] Add `bracketPosition` field (INTEGER) to Match model in Models/Match.js
- [X] T006 [P] Add `endReason` field (ENUM with all end reasons) to Match model in Models/Match.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that MUST be complete before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create BracketService skeleton in Services/bracketService.js
- [X] T008 Implement `progressWinner(matchId)` method in BracketService
  - Look up finished match's winnerId and nextMatchId/nextMatchSlot
  - Update nextMatch's player1Id or player2Id
  - Handle null nextMatchId (Final match — no progression)
- [X] T009 Implement `buildBracketTree(tournamentId, weightClass, gender)` method in BracketService
  - Fetch all matches for tournament/weight/gender
  - Build hash map by match id
  - Recursively attach feeder matches as player1Source/player2Source
  - Return nested JSON with root = Final match (nextMatchId is null)
- [X] T010 Implement `determineCurrentStage(matches)` method in BracketService
  - Find deepest stage with at least one IN_PROGRESS or SCHEDULED match
- [X] T011 Implement `overrideNextMatchSlot(matchId, playerId)` method in BracketService
  - Allows Head Judge to manually assign a player to a next match slot
  - Validates the target match is not yet finished

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Automatic Progression (Priority: P1) 🎯 MVP

**Goal**: When a match finishes, the winner automatically advances to the correct slot in the next round's match, and BRACKET:UPDATED is broadcast.

**Independent Test**: Create a tournament with 4 players (2 matches → 1 Final). Finish both semifinals and verify the Final match has both player slots filled with the correct winners.

### Tests for User Story 1

- [X] T012 [P] [US1] Unit test: progression advances winner to PLAYER1 slot in tests/unit/bracketService.test.js
- [X] T013 [P] [US1] Unit test: progression advances winner to PLAYER2 slot in tests/unit/bracketService.test.js
- [X] T014 [P] [US1] Unit test: progression does nothing for Final match (no nextMatchId) in tests/unit/bracketService.test.js
- [X] T015 [P] [US1] Unit test: progression with bye match (endReason BYE) in tests/unit/bracketService.test.js
- [ ] T016 [P] [US1] Unit test: simultaneous match conclusions both fill correct slots in tests/unit/bracketService.test.js
- [X] T017 [P] [US1] Unit test: no progression when match is CANCELLED in tests/unit/bracketService.test.js

### Implementation for User Story 1

- [X] T018 [US1] Integrate progression hook into MatchService after match finishes in Services/matchService.js
- [X] T019 [US1] Emit BRACKET:UPDATED socket event on successful progression in socket/handlers/scoringHandler.js and Controllers/matchController.js
- [X] T020 [US1] Add BRACKET:UPDATED event to Socket.IO contract documentation in specs/004-bracket-progression-flow/contracts/websocket.md

**Checkpoint**: US1 complete — winners automatically advance to next match on match finish

---

## Phase 4: User Story 2 - Bracket Tree Endpoint (Priority: P2)

**Goal**: The bracket tree is exposed via GET /api/tournaments/:id/bracket, returning nested JSON with correct stages, match counts, and current stage.

**Independent Test**: Create a tournament with 8 players, generate bracket, call the bracket endpoint, and verify the response contains 4 QF + 2 SF + 1 Final matches in the correct nested structure.

### Tests for User Story 2

- [X] T021 [P] [US2] Unit test: buildBracketTree with 8 players in tests/unit/bracketService.test.js
- [ ] T022 [P] [US2] Unit test: buildBracketTree with 10 players (with byes) in tests/unit/bracketService.test.js
- [X] T023 [P] [US2] Unit test: buildBracketTree with empty bracket in tests/unit/bracketService.test.js
- [X] T024 [P] [US2] Unit test: buildBracketTree with single match (Final only) in tests/unit/bracketService.test.js
- [X] T025 [P] [US2] Unit test: determineCurrentStage with mixed states in tests/unit/bracketService.test.js
- [X] T026 [P] [US2] Contract test: bracket response shape matches contract in tests/contract/bracket.contract.test.js
- [X] T027 [P] [US2] Integration test: GET /api/tournaments/:id/bracket returns 200 in tests/integration/bracket.test.js
- [X] T028 [P] [US2] Integration test: GET /api/tournaments/:id/bracket with missing params returns 400 in tests/integration/bracket.test.js
- [X] T029 [P] [US2] Integration test: GET /api/tournaments/:id/bracket for non-existent tournament in tests/integration/bracket.test.js
- [ ] T030 [P] [US2] Integration test: match finish → progression reflected in bracket tree in tests/integration/bracket.test.js

### Implementation for User Story 2

- [X] T031 [P] [US2] Create bracket query parameter validator in utils/validators/bracketValidator.js
- [X] T032 [P] [US2] Create BracketController with GET handler in Controllers/bracketController.js
- [X] T033 [US2] Add GET /api/tournaments/:id/bracket route in Routes/tournamentRoutes.js
- [X] T034 [US2] Wire BracketService.buildBracketTree into BracketController response

**Checkpoint**: US2 complete — clients can fetch the bracket tree for any weight class and gender

---

## Phase 5: User Story 3 - Manual Override (Priority: P3)

**Goal**: Head Judge can manually assign a player to a next-match slot when automatic progression cannot determine the winner (withdrawal, double disqualification).

**Independent Test**: Finish a match, then use the manual override to place a different player in the next match slot (simulating walkover). Verify the bracket tree reflects the override.

### Tests for User Story 3

- [X] T035 [P] [US3] Unit test: override assigns player to empty slot in tests/unit/bracketService.test.js
- [ ] T036 [P] [US3] Unit test: override replaces existing winner in slot in tests/unit/bracketService.test.js
- [X] T037 [P] [US3] Unit test: override rejected when target match is already FINISHED in tests/unit/bracketService.test.js
- [X] T038 [P] [US3] Integration test: manual override endpoint returns 200 and bracket updates in tests/integration/bracket.test.js

### Implementation for User Story 3

- [X] T039 [US3] Implement manual override REST endpoint in Controllers/bracketController.js
- [X] T040 [US3] Add POST /api/tournaments/:id/bracket/override route in Routes/tournamentRoutes.js
- [X] T041 [US3] Add validator for manual override (matchId, playerId) in utils/validators/bracketValidator.js
- [X] T042 [US3] Add override to contract docs in specs/004-bracket-progression-flow/contracts/rest-api.md

**Checkpoint**: US3 complete — Head Judge can manually override bracket progression

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user states

- [X] T043 [P] Update Postman collection with new endpoints (GET bracket, POST override) in postman/collection.json
- [X] T044 [P] Add endReason to MatchEvent audit trail on match finish
- [ ] T045 Run quickstart.md verification steps to validate full flow
- [ ] T046 Review Constitution compliance for all new files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — model changes are independent
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (Automatic Progression): Core engine — needed for US3 integration tests
  - US2 (Bracket Tree): Independent of US1
  - US3 (Manual Override): Depends on bracket endpoint existing
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — No dependencies on other stories
- **US2 (P2)**: Can start after Foundational — No dependencies on other stories
- **US3 (P3)**: Depends on bracket tree endpoint (US2) being available

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Services before endpoints
- Core implementation before integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- T007 and T008 in Foundational can run together
- US1 and US2 can be worked on in parallel by different team members
- Tests within a story marked [P] can run in parallel
- T031 and T032 (US2) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together:
Task: "Unit test: progression advances winner to PLAYER1 slot"
Task: "Unit test: progression advances winner to PLAYER2 slot"
Task: "Unit test: progression does nothing for Final match"
Task: "Unit test: progression with bye match"
Task: "Unit test: simultaneous match conclusions"
Task: "Unit test: no progression when match is CANCELLED"

# Launch all US1 implementation together:
Task: "Integrate progression hook into MatchService"
Task: "Emit BRACKET:UPDATED socket event"
```

## Parallel Example: User Story 2

```bash
# Launch all US2 tests together:
Task: "Unit test: buildBracketTree with 8 players"
Task: "Unit test: buildBracketTree with 10 players (byes)"
Task: "Unit test: buildBracketTree with empty bracket"
Task: "Unit test: buildBracketTree with single match"
Task: "Unit test: determineCurrentStage with mixed states"

# Launch validator + controller in parallel:
Task: "Create bracket query parameter validator"
Task: "Create BracketController with GET handler"

# Then wire route + service together:
Task: "Add GET /api/tournaments/:id/bracket route"
Task: "Wire BracketService into BracketController"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (model changes)
2. Complete Phase 2: Foundational (BracketService core methods)
3. Complete Phase 3: User Story 1 (progression engine + socket broadcast)
4. **STOP and VALIDATE**: Finish a match, verify winner advances
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Progression engine ready
2. Add US1 (Automatic Progression) → Test → Deploy/Demo (MVP!)
3. Add US2 (Bracket Tree Endpoint) → Test → Deploy/Demo
4. Add US3 (Manual Override) → Test → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (progression engine)
   - Developer B: US2 (bracket tree endpoint)
3. After US1 + US2 complete: Developer C: US3 (manual override)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (test-first per constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The spec does not explicitly request tests, but the constitution (Principle VIII) requires test-first for all features
