# Tasks: Taekwondo Match Management System

**Input**: Design documents from `/specs/001-tkd-match-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan with backend/ directory
- [ ] T002 Initialize Node.js/TypeScript project with package.json, tsconfig.json
- [ ] T003 [P] Install dependencies: express, sequelize, socket.io, jsonwebtoken, bcryptjs
- [ ] T004 [P] Configure ESLint and Prettier in backend/
- [ ] T005 Create .env.example with DATABASE_URL, JWT_SECRET, PORT configuration
- [ ] T006 Setup database configuration in backend/src/config/database.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create User model in backend/src/models/User.ts with role enum (ADMIN, HEAD_JUDGE, MAT_JUDGE, SCOREKEEPER)
- [ ] T008 [P] Create Club model in backend/src/models/Club.ts
- [ ] T009 Setup JWT authentication middleware in backend/src/middleware/auth.ts
- [ ] T010 [P] Implement role-based access control middleware in backend/src/middleware/rbac.ts
- [ ] T011 [P] Create validation middleware in backend/src/middleware/validation.ts
- [ ] T012 Implement auth service for login/token generation in backend/src/services/authService.ts
- [ ] T013 Create auth routes in backend/src/routes/auth.routes.ts with POST /api/auth/login
- [ ] T014 [P] Setup Socket.io server with namespace /live-matches in backend/src/config/socket.ts
- [ ] T015 Create main app entry point in backend/src/app.ts with Express and Socket.io setup

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Tournament Setup (Priority: P1) MVP

**Goal**: Admin can create and configure tournaments with weight classes, round durations, rest periods, and point gap rules

**Independent Test**: Create a tournament via API, verify settings are stored and retrievable

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create Tournament model in backend/src/models/Tournament.ts with JSONB settings field
- [ ] T017 [US1] Implement tournament service in backend/src/services/tournamentService.ts
- [ ] T018 [US1] Create tournament routes in backend/src/routes/tournament.routes.ts
- [ ] T019 [US1] Add POST /api/tournaments endpoint for tournament creation (ADMIN only)
- [ ] T020 [US1] Add GET /api/tournaments/:id endpoint for tournament retrieval
- [ ] T021 [US1] Implement tournament settings validation (weight classes, durations)
- [ ] T022 [US1] Add GET /api/tournaments list endpoint with completion filter

**Checkpoint**: Tournament CRUD functional - Admin can create and configure tournaments

---

## Phase 4: User Story 2 - Player Registration (Priority: P1)

**Goal**: Admin can register players individually or in bulk with weight validation and age calculation

**Independent Test**: Register players, verify weight validation against tournament settings, verify age calculation

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create Player model in backend/src/models/Player.ts with computed age fields
- [ ] T024 [US2] Implement age calculation utility in backend/src/utils/ageCalculator.ts
- [ ] T025 [US2] Implement player service in backend/src/services/playerService.ts
- [ ] T026 [US2] Create player routes in backend/src/routes/player.routes.ts
- [ ] T027 [US2] Add POST /api/players endpoint for single player registration (ADMIN only)
- [ ] T028 [US2] Implement weight class validation against tournament settings
- [ ] T029 [US2] Add POST /api/players/bulk endpoint for bulk registration via JSON array
- [ ] T030 [US2] Add GET /api/players?tournamentId=:id list endpoint with filters
- [ ] T031 [US2] Create Club routes in backend/src/routes/club.routes.ts for club management

**Checkpoint**: Player registration functional with bulk import and weight validation

---

## Phase 5: User Story 3 - Bracket Generation (Priority: P2)

**Goal**: Head Judge can generate brackets with club avoidance logic and rest period enforcement

**Independent Test**: Generate bracket, verify club avoidance rules applied, verify rest period validation

### Implementation for User Story 3

- [ ] T032 [P] [US3] Create Match model in backend/src/models/Match.ts with status enum
- [ ] T033 [P] [US3] Create MatchEvent model in backend/src/models/MatchEvent.ts for audit trail
- [ ] T034 [US3] Implement rest period validator utility in backend/src/utils/restPeriodValidator.ts
- [ ] T035 [US3] Implement matchmaking service in backend/src/services/matchmakingService.ts
- [ ] T036 [US3] Implement club avoidance algorithm with 3-tier fallback logic
- [ ] T037 [US3] Add POST /api/matches/generate endpoint for bracket generation (HEAD_JUDGE only)
- [ ] T038 [US3] Implement intra-club warning flagging for unavoidable same-club matches
- [ ] T039 [US3] Add rest period validation during match scheduling
- [ ] T040 [US3] Add GET /api/matches/:id endpoint for match details

**Checkpoint**: Bracket generation functional with club avoidance and rest period enforcement

---

## Phase 6: User Story 4 - Live Match Execution (Priority: P2)

**Goal**: Mat Judge can start, pause, resume, end matches with real-time scoring via WebSockets

**Independent Test**: Start match, add points via WebSocket, verify state updates broadcast, verify point gap auto-end

### Implementation for User Story 4

- [ ] T041 [US4] Implement match service in backend/src/services/matchService.ts
- [ ] T042 [US4] Implement match state machine with valid transitions
- [ ] T043 [US4] Add POST /api/matches/:id/start endpoint (MAT_JUDGE only)
- [ ] T044 [US4] Add POST /api/matches/:id/pause endpoint
- [ ] T045 [US4] Add POST /api/matches/:id/resume endpoint
- [ ] T046 [US4] Add POST /api/matches/:id/end endpoint with winner selection
- [ ] T047 [US4] Implement scoring service in backend/src/services/scoringService.ts
- [ ] T048 [US4] Implement scoring validation (match state, player in match, round validity)
- [ ] T049 [US4] Implement point gap auto-end logic with MATCH:FINISHED_BY_POINT_GAP broadcast
- [ ] T050 [US4] Create Socket.io scoring handler in backend/src/socket/handlers/scoring.handler.ts
- [ ] T051 [US4] Implement MATCH:ADD_POINT WebSocket event handler
- [ ] T052 [US4] Implement MATCH:REMOVE_POINT WebSocket event handler
- [ ] T053 [US4] Implement MATCH:END_ROUND WebSocket event handler
- [ ] T054 [US4] Implement match room management (join_match, leave_match)
- [ ] T055 [US4] Implement Socket.io authentication middleware in backend/src/socket/middleware/socketAuth.ts
- [ ] T056 [US4] Add POST /api/matches/:id/cancel endpoint with role-based rules

**Checkpoint**: Live match execution functional with real-time scoring and state machine

---

## Phase 7: User Story 5 - Score Monitoring (Priority: P3)

**Goal**: Scorekeeper can view real-time scores and match schedules on display boards (read-only)

**Independent Test**: Connect as scorekeeper, verify receive score updates, verify cannot modify state

### Implementation for User Story 5

- [ ] T057 [US5] Implement match handler in backend/src/socket/handlers/match.handler.ts
- [ ] T058 [US5] Implement JOIN_MATCH event for scorekeeper read-only access
- [ ] T059 [US5] Implement MATCH:STATE_UPDATE broadcast on state changes
- [ ] T060 [US5] Implement MATCH:SCORE_UPDATE broadcast on scoring events
- [ ] T061 [US5] Add scheduled match listing endpoint for display boards
- [ ] T062 [US5] Verify scorekeeper cannot emit scoring events (read-only enforcement)

**Checkpoint**: Score monitoring functional with read-only access for scorekeepers

---

## Phase 8: User Story 6 - Reconnection Sync (Priority: P2)

**Goal**: Clients automatically receive current match state when reconnecting after disconnection

**Independent Test**: Connect, disconnect, reconnect, verify state synchronization

### Implementation for User Story 6

- [ ] T063 [US6] Implement message queue for disconnected clients in backend/src/socket/handlers/match.handler.ts
- [ ] T064 [US6] Implement MATCH:REQUEST_STATE event for explicit state requests
- [ ] T065 [US6] Implement MATCH:TIMER_SYNC periodic broadcast every 10 seconds
- [ ] T066 [US6] Add reconnection state sync logic in Socket.io connection handler
- [ ] T067 [US6] Implement queue cleanup after 30-second timeout
- [ ] T068 [US6] Add MATCH:REST_VIOLATION_WARNING event for scheduling conflicts

**Checkpoint**: Reconnection sync functional with message queuing and state recovery

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T069 [P] Add comprehensive error handling with structured error responses
- [ ] T070 [P] Implement input validation across all endpoints
- [ ] T071 [P] Add request logging and audit trail for API operations
- [ ] T072 Implement tournament read-only enforcement after completion
- [ ] T073 [P] Add database indexes for performance optimization
- [ ] T074 Implement rate limiting for WebSocket events
- [ ] T075 Add API documentation with OpenAPI/Swagger
- [ ] T076 Run quickstart.md validation steps
- [ ] T077 Final code review and cleanup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (Tournament Setup) and US2 (Player Registration) can run in parallel
  - US3 (Bracket Generation) depends on US1 and US2
  - US4 (Live Match Execution) depends on US3
  - US5 (Score Monitoring) depends on US4
  - US6 (Reconnection Sync) depends on US4
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent, can parallel with US1
- **User Story 3 (P2)**: Depends on US1 (tournament) and US2 (players) completion
- **User Story 4 (P2)**: Depends on US3 (matches created by bracket generation)
- **User Story 5 (P3)**: Depends on US4 (needs live match infrastructure)
- **User Story 6 (P2)**: Depends on US4 (needs WebSocket infrastructure)

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003, T004 (Setup tasks) can run in parallel
- T008, T010, T011, T014 (Foundational tasks) can run in parallel
- T016 (US1 model) and T023 (US2 model) can run in parallel
- T032, T033 (US3 models) can run in parallel
- T069, T070, T071 (Polish tasks) can run in parallel

---

## Parallel Example: User Story 1 & 2

```bash
# Launch models for US1 and US2 together:
Task: "Create Tournament model in backend/src/models/Tournament.ts"
Task: "Create Player model in backend/src/models/Player.ts"

# Launch services for US1 and US2 together (after models complete):
Task: "Implement tournament service in backend/src/services/tournamentService.ts"
Task: "Implement player service in backend/src/services/playerService.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Tournament Setup)
4. **STOP and VALIDATE**: Test tournament creation independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Tournaments) → Test independently → Deploy/Demo
3. Add User Story 2 (Players) → Test independently → Deploy/Demo
4. Add User Story 3 (Bracket Generation) → Test independently → Deploy/Demo
5. Add User Story 4 (Live Match) → Test independently → Deploy/Demo
6. Add User Story 5 & 6 (Monitoring & Sync) → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Tournaments)
   - Developer B: User Story 2 (Players)
3. After US1 & US2 complete:
   - Developer A: User Story 3 (Bracket Generation)
   - Developer B: User Story 4 (Live Match Execution)
4. After US3 & US4 complete:
   - Developer A: User Story 5 (Score Monitoring)
   - Developer B: User Story 6 (Reconnection Sync)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
