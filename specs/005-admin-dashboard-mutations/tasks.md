# Tasks: Admin Dashboard Mutations

**Input**: Design documents from `/specs/005-admin-dashboard-mutations/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in feature specification. Test tasks omitted per Task Generation Rules.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `Models/`, `Services/`, `Controllers/`, `Routes/`, `utils/`, `middlewares/`, `tests/` at repository root
- Paths follow existing codebase conventions (capitalized directory names)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: AuditLog entity, shared admin guard, and pagination wiring — blocking prerequisites for ALL user stories

- [ ] T001 [P] Create AuditLog Sequelize model in Models/AuditLog.js per data-model.md (INTEGER PK, action ENUM, entityType, entityId, metadata JSONB, createdAt, no timestamps)
- [ ] T002 [P] Create audit_logs table migration SQL in a new migration file under config/migrations/ or document manual SQL execution per data-model.md
- [ ] T003 Add AuditLog associations to Models/index.js (User.hasMany AuditLog, AuditLog.belongsTo User as 'actor')
- [ ] T004 Replace auditService stub in Services/auditService.js with real implementation that writes AuditLog records (non-blocking: catch errors, log to console only)
- [ ] T005 [P] Extract adminGuard from Routes/tournamentRoutes.js into shared middleware in middlewares/adminGuard.js (global admin role check only per clarification Q1)
- [ ] T006 [P] Add ADMIN_ACTIONS and ADMIN_RESOURCES constants to config/constants.js for audit log action values
- [ ] T007 Update Routes/tournamentRoutes.js to import shared adminGuard from middlewares/adminGuard.js instead of inline definition

**Checkpoint**: AuditLog model exists, auditService writes real records, shared adminGuard available. User story implementation can begin.

---

## Phase 2: User Story 1 — Player Management (Priority: P1) MVP

**Goal**: Admin can retrieve, update, delete, and list players with pagination. Bulk player creation formalized.

**Independent Test**: Create a player via existing POST endpoint, then GET by ID, UPDATE weight, LIST with pagination, and DELETE (with active match guard).

### Implementation for User Story 1

- [ ] T008 Add getById method to Services/playerService.js (return player with computed age and club name)
- [ ] T009 [P] Add updatePlayerValidation to utils/validators/playerValidator.js (validate name, dob, weight, gender, clubId, seed, photoUrl — all optional)
- [ ] T010 [P] Add deletePlayerValidation to utils/validators/playerValidator.js (validate id param is integer)
- [ ] T011 Add update method to Services/playerService.js (validate tournament exists and not completed, club exists if changing club, weight within tournament range; write AuditLog UPDATE)
- [ ] T012 Add delete method to Services/playerService.js (check no SCHEDULED/IN_PROGRESS matches exist; write AuditLog DELETE; throw 409 CONFLICT if active matches)
- [ ] T013 Add list method to Services/playerService.js with pagination (use parsePagination from utils/pagination.js, filter by tournamentId/gender/clubId/weightClass, include Club name)
- [ ] T014 Update existing bulkCreate method in Services/playerService.js to write AuditLog CREATE for each created player
- [ ] T015 [P] Add getById, update, delete, list controller methods to Controllers/playerController.js (delegate to service, use successResponse/paginatedResponse)
- [ ] T016 [P] Add GET /:id, PUT /:id, DELETE /:id, GET / (paginated) routes to Routes/playerRoutes.js (protect + adminGuard for mutations, protect for reads)
- [ ] T017 Update existing playerController.create and playerController.bulkCreate to write AuditLog via auditService

**Checkpoint**: Player CRUD fully functional with audit logging. Can GET/UPDATE/DELETE/LIST players independently.

---

## Phase 3: User Story 2 — Club Management (Priority: P2)

**Goal**: Admin can retrieve, update, delete, and list clubs with pagination.

**Independent Test**: Create a club via existing POST endpoint, then GET by ID, UPDATE name, LIST with pagination, and DELETE (with no-players guard).

### Implementation for User Story 2

- [ ] T018 Add getById method to Services/clubService.js (return club with playerCount via include/count)
- [ ] T019 [P] Add updateClubValidation to utils/validators/clubValidator.js (validate name is string, required)
- [ ] T020 [P] Add deleteClubValidation to utils/validators/clubValidator.js (validate id param is integer)
- [ ] T021 Add update method to Services/clubService.js (enforce unique name via findOrCreate pattern; write AuditLog UPDATE)
- [ ] T022 Add delete method to Services/clubService.js (check no players assigned; write AuditLog DELETE; throw 409 CONFLICT if players exist)
- [ ] T023 Add list method to Services/clubService.js with pagination (use parsePagination, optional search by name, include playerCount)
- [ ] T024 [P] Add getById, update, delete, list controller methods to Controllers/clubController.js
- [ ] T025 [P] Add GET /:id, PUT /:id, DELETE /:id, GET / (paginated) routes to Routes/clubRoutes.js

**Checkpoint**: Club CRUD fully functional with audit logging. Can GET/UPDATE/DELETE/LIST clubs independently.

---

## Phase 4: User Story 3 — Tournament Lifecycle Management (Priority: P3)

**Goal**: Admin can update tournament details, mark complete, delete, and list with pagination and stats.

**Independent Test**: Create tournament via existing POST, then GET with stats, UPDATE name/dates, mark complete (rejects if IN_PROGRESS matches), delete (rejects if players/matches exist).

### Implementation for User Story 3

- [ ] T026 Add getById method to Services/tournamentService.js with summary stats (playerCount, matchCount, matchesByStatus aggregation)
- [ ] T027 [P] Add updateTournamentValidation to utils/validators/tournamentValidator.js (validate name, startDate, endDate — all optional)
- [ ] T028 [P] Add markCompleteValidation to utils/validators/tournamentValidator.js (validate id param)
- [ ] T029 [P] Add deleteTournamentValidation to utils/validators/tournamentValidator.js (validate id param)
- [ ] T030 Add update method to Services/tournamentService.js (reject if isCompleted; write AuditLog UPDATE)
- [ ] T031 Add markComplete method to Services/tournamentService.js (check no IN_PROGRESS matches; set isCompleted=true; write AuditLog MARK_COMPLETE)
- [ ] T032 Add delete method to Services/tournamentService.js (check no players or matches associated; write AuditLog DELETE; throw 409 if associations exist)
- [ ] T033 Add list method to Services/tournamentService.js with pagination (use parsePagination, filter by completed/date range, include playerCount and matchCount)
- [ ] T034 [P] Add getById, update, markComplete, delete, list controller methods to Controllers/tournamentController.js
- [ ] T035 [P] Add PUT /:id, DELETE /:id, POST /:id/complete, GET /:id (with stats), GET / (paginated) routes to Routes/tournamentRoutes.js

**Checkpoint**: Tournament lifecycle fully functional with audit logging. Can update, complete, delete, and list tournaments.

---

## Phase 5: User Story 4 — Match Scheduling and Overrides (Priority: P4)

**Goal**: Admin can list matches, manually schedule, reschedule, cancel, and assign walkover results.

**Independent Test**: Generate bracket matches via existing POST /generate, then LIST matches, SCHEDULE a friendly match, RESCHEDULE it, CANCEL it, and assign WALKOVER to another match.

### Implementation for User Story 4

- [ ] T036 Add list method to Services/matchService.js with pagination (use parsePagination, filter by tournamentId/status/weightClass/bracketRound, include player names)
- [ ] T037 Add schedule method to Services/matchService.js (validate both players exist in tournament, check conflict window using roundDurationSec × maxRounds per R4, create match with status SCHEDULED; write AuditLog SCHEDULE_MATCH)
- [ ] T038 Add reschedule method to Services/matchService.js (validate match is SCHEDULED, check conflict window, update scheduledTime; write AuditLog RESCHEDULE_MATCH)
- [ ] T039 Add walkover method to Services/matchService.js (validate match exists and is SCHEDULED/IN_PROGRESS, winner is one of the two players, call existing endMatch logic with endReason WALKOVER; write AuditLog WALKOVER)
- [ ] T040 [P] Add scheduleMatchValidation to utils/validators/matchValidator.js (validate tournamentId, player1Id, player2Id, scheduledTime, optional type/weightClass)
- [ ] T041 [P] Add rescheduleMatchValidation to utils/validators/matchValidator.js (validate scheduledTime is ISO8601 and in future)
- [ ] T042 [P] Add walkoverValidation to utils/validators/matchValidator.js (validate winnerId, endReason)
- [ ] T043 [P] Add list, schedule, reschedule, walkover controller methods to Controllers/matchController.js
- [ ] T044 [P] Add GET /, POST /schedule, PUT /:id/reschedule, POST /:id/walkover routes to Routes/matchRoutes.js (protect + adminGuard/HEAD_JUDGE for mutations)

**Checkpoint**: Match scheduling fully functional with audit logging. Can list, schedule, reschedule, cancel, and walkover matches.

---

## Phase 6: User Story 5 — User and Role Administration (Priority: P5)

**Goal**: Super admin can list users, assign/revoke TKD roles, and deactivate/reactivate accounts.

**Independent Test**: List all users, assign MAT_JUDGE role to a user, revoke it, deactivate the user (verify they can't login), reactivate.

### Implementation for User Story 5

- [ ] T045 Create Services/adminService.js with listUsers method (paginated, include globalRole/tkdRole/isActive/createdAt)
- [ ] T046 Add assignRole method to Services/adminService.js (validate target user exists, tkdRole is valid ENUM value; write AuditLog ASSIGN_ROLE)
- [ ] T047 Add revokeRole method to Services/adminService.js (set tkdRole to null; write AuditLog REVOKE_ROLE)
- [ ] T048 Add deactivateUser method to Services/adminService.js (check user not judge on IN_PROGRESS match per EC6; set isActive=false; write AuditLog DEACTIVATE)
- [ ] T049 Add reactivateUser method to Services/adminService.js (set isActive=true; write AuditLog REACTIVATE)
- [ ] T050 [P] Create utils/validators/adminValidator.js with assignRoleValidation (validate tkdRole is valid ENUM or null) and userIdValidation
- [ ] T051 [P] Create Controllers/adminController.js with listUsers, assignRole, revokeRole, deactivateUser, reactivateUser methods
- [ ] T052 [P] Create Routes/adminRoutes.js with GET /users, PUT /users/:id/role, PUT /users/:id/deactivate, PUT /users/:id/reactivate (protect + roleGuard('super_admin'))
- [ ] T053 Mount adminRoutes in Routes/index.js as router.use('/admin', adminRoutes)

**Checkpoint**: User administration fully functional with audit logging. Can list, assign roles, deactivate, and reactivate users.

---

## Phase 7: User Story 6 — Dashboard Overview (Priority: P6)

**Goal**: Admin can view aggregate tournament statistics and tournament list with quick-glance status.

**Independent Test**: Request tournament overview (verify playerCount, matchesByStatus, upcomingMatches), list all tournaments with status indicators.

### Implementation for User Story 6

- [ ] T054 Add getTournamentOverview method to Services/tournamentService.js (aggregate: totalPlayers, totalMatches, matchesByStatus, upcomingMatches within next hour using scheduledTime)
- [ ] T055 Add getTournamentList method to Services/tournamentService.js (paginated, include playerCount and matchCount per tournament)
- [ ] T056 [P] Add getOverview, getList controller methods to Controllers/tournamentController.js (or new Controllers/dashboardController.js)
- [ ] T057 [P] Add GET /dashboard/tournaments/:id/overview, GET /dashboard/tournaments routes to Routes/tournamentRoutes.js or new Routes/dashboardRoutes.js

**Checkpoint**: Dashboard statistics fully functional. Can view tournament overview and list with status.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T058 Update Postman collection in postman/collection.json with all new endpoints (per constitution principle IX)
- [ ] T059 Add rate limiting to mutation endpoints via rateLimiter middleware where appropriate (user admin, bulk operations)
- [ ] T060 Validate all new endpoints follow error response conventions (ApiErrors.* with status, message, code)
- [ ] T061 Run quickstart.md validation — execute all manual test commands against running server

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Player Management (Phase 2)**: Depends on Setup (AuditLog, adminGuard)
- **Club Management (Phase 3)**: Depends on Setup (AuditLog, adminGuard) — parallelizable with Phase 2
- **Tournament Management (Phase 4)**: Depends on Setup (AuditLog, adminGuard) — parallelizable with Phases 2-3
- **Match Scheduling (Phase 5)**: Depends on Phases 2 and 4 (needs Player and Tournament endpoints available for scheduling)
- **User Administration (Phase 6)**: Depends on Setup only — parallelizable with Phases 2-5
- **Dashboard Overview (Phase 7)**: Depends on Phases 2, 3, 4, and 5 (aggregates data from all entities)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Player Mgmt)**: Depends on Setup only — independent
- **US2 (Club Mgmt)**: Depends on Setup only — independent
- **US3 (Tournament Mgmt)**: Depends on Setup only — independent
- **US4 (Match Scheduling)**: Depends on US1 + US3 (needs players and tournaments to schedule matches)
- **US5 (User Admin)**: Depends on Setup only — independent
- **US6 (Dashboard)**: Depends on US1 + US2 + US3 + US4 (aggregates all entity data)

### Within Each User Story

- Validators before services (T009/T010 before T011/T012)
- Services before controllers (T011-T013 before T015)
- Controllers before routes (T015 before T016)
- Audit logging integrated into service methods

### Parallel Opportunities

- **Phase 1**: T001 + T002 + T005 + T006 can all run in parallel
- **Phases 2-4**: US1, US2, US3 can all run in parallel after Setup
- **Phase 5**: T040 + T041 + T042 + T043 can run in parallel (different files)
- **Phase 6**: T050 + T051 + T052 + T053 can run in parallel (different files)

---

## Parallel Example: Phases 2-4 (Player, Club, Tournament)

```bash
# After Setup completes, launch all three entity CRUD stories in parallel:
Task (US1): "Add getById method to Services/playerService.js"
Task (US2): "Add getById method to Services/clubService.js"
Task (US3): "Add getById method to Services/tournamentService.js"

# Validators can also run in parallel across stories:
Task (US1): "Add updatePlayerValidation to utils/validators/playerValidator.js"
Task (US2): "Add updateClubValidation to utils/validators/clubValidator.js"
Task (US3): "Add updateTournamentValidation to utils/validators/tournamentValidator.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (AuditLog + adminGuard)
2. Complete Phase 2: Player Management
3. **STOP and VALIDATE**: Test player CRUD independently
4. Deploy/demo if ready

### Incremental Delivery

1. Setup → Foundation ready
2. Player Management → Test independently → Deploy/Demo (MVP!)
3. Club Management → Test independently → Deploy/Demo
4. Tournament Management → Test independently → Deploy/Demo
5. Match Scheduling → Test independently → Deploy/Demo
6. User Administration → Test independently → Deploy/Demo
7. Dashboard Overview → Test independently → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together
2. Once Setup is done:
   - Developer A: Player Management (US1)
   - Developer B: Club Management (US2)
   - Developer C: Tournament Management (US3)
3. After US1+US3 complete:
   - Developer A: Match Scheduling (US4)
   - Developer B: User Administration (US5)
4. After all entities ready:
   - Developer A: Dashboard Overview (US6)
   - Developer B: Polish & Postman
5. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Audit logging is integrated into each service method (not a separate phase) to ensure no mutation is missed
- Pagination wiring uses existing utils/pagination.js and utils/httpResponse.js — no new pagination code needed
- The adminGuard is now shared via middlewares/adminGuard.js (extracted from tournamentRoutes.js per R2)
