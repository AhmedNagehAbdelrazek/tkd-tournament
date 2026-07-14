# Tasks: Gender-Specific Weight Classes

**Input**: Design documents from `/specs/003-gender-weight-classes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update tournament validator to accept gender-keyed weight class structure

- [x] T001 Update tournament validator to accept gender-keyed weightClasses object in `utils/validators/tournamentValidator.js`
- [x] T002 [P] Add `updateSettingsValidation` chain in `utils/validators/tournamentValidator.js` for PUT /:id/settings endpoint (weightClasses object, name/min/max per entry)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service functions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement `findExcludedPlayers(tournamentId)` in `Services/tournamentService.js` — queries all players in tournament, evaluates each against gender-specific weight classes, returns array of excluded player objects with id, name, gender, weight, clubName, reason
- [x] T004 Implement `buildExclusionReason(player, tournament)` helper in `Services/tournamentService.js` — generates reason string: "No {GENDER} weight class matches {WEIGHT}kg — available ranges: {list}" or "No weight classes configured for {GENDER} division"
- [x] T005 Implement `hasInProgressMatches(tournamentId)` guard in `Services/tournamentService.js` — queries Match model for any match with status IN_PROGRESS in the tournament, returns boolean

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Gender-Keyed Tournament Settings (Priority: P1) 🎯 MVP

**Goal**: Admin can create and update tournaments with gender-separated weight classes; settings are locked when matches are in progress; response includes excluded players with reasons

**Independent Test**: Create a tournament with gender-keyed weight classes, verify response includes excludedPlayers array. Attempt to update settings on a tournament with in-progress matches, verify rejection.

### Implementation for User Story 1

- [x] T006 [US1] Update `create(data)` in `Services/tournamentService.js` — after creating tournament, call `findExcludedPlayers`, return tournament with `excludedPlayers` array in response
- [x] T007 [US1] Update `updateSettings(id, settings)` in `Services/tournamentService.js` — add `hasInProgressMatches` guard before allowing update; after updating, call `findExcludedPlayers`, return tournament with `excludedPlayers` array
- [x] T008 [US1] Add `updateSettings` handler in `Controllers/tournamentController.js` — delegates to `tournamentService.updateSettings`, uses `successResponse`
- [x] T009 [US1] Add `PUT /:id/settings` route in `Routes/tournamentRoutes.js` — protect + adminGuard + updateSettingsValidation + validate + controller
- [x] T010 [US1] Update `create` handler in `Controllers/tournamentController.js` — return response shaped as `{ tournament, excludedPlayers }` instead of raw tournament

**Checkpoint**: Tournament create/update returns gender-keyed weight classes with excluded players. Settings lock works.

---

## Phase 4: User Story 2 — Gender-Aware Player Registration (Priority: P1) 🎯 MVP

**Goal**: Player registration validates weight against gender-specific classes only; matchmaking uses gender-keyed weight class lookup; player list supports gender-aware weight class filtering

**Independent Test**: Register a male player whose weight falls in a male weight class (accepted). Register a female player whose weight falls in a male weight class (rejected). Generate bracket with gender parameter.

### Implementation for User Story 2

- [x] T011 [US2] Update `validateWeight(tournament, weight, gender)` in `Services/playerService.js` — accept `gender` parameter, look up `tournament.settings.weightClasses[gender]`, check weight against that array only; throw descriptive error with available ranges for the gender
- [x] T012 [US2] Update `create(data)` in `Services/playerService.js` — pass `data.gender` to `validateWeight`
- [x] T013 [US2] Update `bulkCreate(data)` in `Services/playerService.js` — pass each player's gender to `validateWeight`
- [x] T014 [US2] Update `list(query)` weight class filter in `Services/playerService.js` — when filtering by weightClass, resolve the class from `settings.weightClasses[query.gender]` instead of flat array
- [x] T015 [US2] Update `generateBracket(data)` in `Services/matchmakingService.js` — resolve weight class from `tournament.settings.weightClasses[data.gender]` instead of flat array

**Checkpoint**: Player registration and matchmaking respect gender-specific weight classes.

---

## Phase 5: User Story 3 — Excluded Players Endpoint (Priority: P2)

**Goal**: Dedicated endpoint to retrieve all excluded players for a tournament with full details and reasons

**Independent Test**: Call GET /api/tournaments/:id/excluded-players, verify response contains excludedPlayers array with id, name, gender, weight, clubName, reason for each.

### Implementation for User Story 3

- [x] T016 [US3] Add `getExcludedPlayers` handler in `Controllers/tournamentController.js` — calls `tournamentService.findExcludedPlayers`, uses `successResponse`
- [x] T017 [US3] Add `GET /:id/excluded-players` route in `Routes/tournamentRoutes.js` — protect + controller

**Checkpoint**: Excluded players can be queried independently via dedicated endpoint.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T018 [P] Update Postman collection in `postman/collection.json` — add PUT /:id/settings and GET /:id/excluded-players requests with examples
- [x] T019 Run quickstart.md validation — verify all examples in `specs/003-gender-weight-classes/quickstart.md` work against implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (validator must accept new structure before services can be tested)
- **US1 (Phase 3)**: Depends on Phase 2 (needs findExcludedPlayers, hasInProgressMatches)
- **US2 (Phase 4)**: Depends on Phase 1 (validator) and Phase 2 (findExcludedPlayers not directly needed, but validateWeight update is independent of US1)
- **US3 (Phase 5)**: Depends on Phase 2 (needs findExcludedPlayers) and Phase 3 (tournament create must return excludedPlayers for consistency)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Phase 2) — core settings change
- **US2 (P1)**: Depends on Setup (Phase 1) — can start after validator update; independent of US1 service changes
- **US3 (P2)**: Depends on US1 (Phase 3) — needs findExcludedPlayers and tournament response shape established

### Within Each User Story

- Services before controllers
- Controllers before routes
- Core implementation before integration

### Parallel Opportunities

- T001 and T002 can run in parallel (different validation chains in same file, but different exports)
- T003, T004, T005 can run in parallel (different functions in same file, but no call dependencies)
- US1 (Phase 3) and US2 (Phase 4) can run in parallel after Phase 2 completes (different files: tournamentService vs playerService/matchmakingService)
- T018 and T019 can run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# US1 implementation tasks (sequential within story due to same-file dependencies):
# T006 → T007 (both in tournamentService.js, T007 depends on T006 pattern)
# T008 (controller, depends on T006/T007 service signatures)
# T009 (route, depends on T008 controller)
# T010 (controller update, depends on T006)
```

## Parallel Example: US1 + US2 (cross-story)

```bash
# After Phase 2 completes, these can run in parallel:
# Developer A: US1 tasks (T006-T010) in tournamentService/Controller/Routes
# Developer B: US2 tasks (T011-T015) in playerService/matchmakingService
# No file conflicts — different services being modified
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup (validator)
2. Complete Phase 2: Foundational (service functions)
3. Complete Phase 3: US1 (tournament settings with excluded players)
4. Complete Phase 4: US2 (gender-aware registration)
5. **STOP and VALIDATE**: Create tournament, register players, verify excluded players
6. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Tournament create/update returns excluded players → Deploy/Demo (MVP!)
3. Phase 4 (US2) → Player registration validates gender-specific classes → Deploy/Demo
4. Phase 5 (US3) → Excluded players endpoint → Deploy/Demo
5. Phase 6 (Polish) → Postman + validation → Final release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No test tasks included (not requested in feature specification)
