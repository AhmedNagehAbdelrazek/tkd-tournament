# Implementation Plan: Admin Dashboard Mutations

**Branch**: `main` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-admin-dashboard-mutations/spec.md`

## Summary

Add comprehensive admin CRUD endpoints for Players, Clubs, Tournaments, Matches, and Users to support a tournament management dashboard. Includes full update/delete operations (currently missing), match scheduling/rescheduling, tournament lifecycle management, user role administration, dashboard statistics, and a new AuditLog entity for non-match mutations. Leverages existing pagination utilities (currently unused) and follows established three-layer architecture patterns.

## Technical Context

**Language/Version**: Node.js 18+ (CommonJS modules)

**Primary Dependencies**: Express 5, Sequelize 6, Socket.IO 4.7, jsonwebtoken 9, express-validator 7, Cloudinary 2.10, multer 2.1

**Storage**: PostgreSQL via Sequelize ORM 6 (INTEGER PKs, JSONB, ENUMs, snake_case columns with `underscored: true`)

**Testing**: Jest 29 + Supertest 7 (unit, integration, contract test suites)

**Target Platform**: Linux server (Vercel deployment via `@vercel/node`)

**Project Type**: Web service (backend-only REST API + WebSocket server)

**Performance Goals**: All mutation endpoints respond within 2 seconds under 100 concurrent admin users (NFR-04). Bulk operations handle up to 500 records without timeout (NFR-06).

**Constraints**: CommonJS module system (`require`/`module.exports`). No TypeScript. Three-layer architecture mandatory (Route → Controller → Service → Model). Soft deletes preferred over hard deletes per constitution.

**Scale/Scope**: ~10-100 concurrent admin users, 10-50 tournaments, 100-1000 players per tournament, 20-200 matches per tournament.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Three-Layer Architecture | PASS | New endpoints follow Route → Controller → Service → Model. Admin guard needs extraction from inline to shared middleware. |
| II. Sequelize Model Convention | PASS | AuditLog model will follow INTEGER PK, `underscored: true`, explicit `field` mapping. Existing models unchanged. |
| III. Controller & Handler Discipline | PASS | Controllers delegate to services. No DB access in controllers. `successResponse`/`paginatedResponse` for responses. |
| IV. Audit Trail & Event Sourcing | PASS | New AuditLog model handles non-match mutations. MatchEvent continues for match-specific events. Both non-blocking. |
| V. Consistent Response & Error Handling | PASS | `successResponse` for single items, `paginatedResponse` for lists, `ApiErrors.*` for errors. |
| VI. Real-Time WebSocket Discipline | N/A | No WebSocket changes in this feature. |
| VII. State Machine & Domain Logic Integrity | PASS | Match state transitions validated. Tournament completion guard (no IN_PROGRESS matches). Delete guards for active associations. |
| VIII. Test-First & Contract Validation | PASS | Contract tests for all new endpoints. Integration tests for CRUD flows. Unit tests for audit logging and conflict detection. |
| IX. Postman Collection Accountability | PASS | Postman collection will be updated with all new endpoints. |

**Gate result**: PASS — no violations. Admin guard extraction from inline to shared middleware is a refactor, not a violation.

## Project Structure

### Documentation (this feature)

```text
specs/005-admin-dashboard-mutations/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── rest-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Existing structure — additions marked with + or *
Controllers/
+   adminController.js          # User admin + dashboard stats controller
    clubController.js           # + add update, delete, getById methods
    matchController.js          # + add list, schedule, reschedule, walkover methods
    playerController.js         # + add getById, update, delete, list methods
    tournamentController.js     # + add update, markComplete, delete, getById with stats methods

Models/
+   AuditLog.js                 # New entity: audit_log table
    index.js                    # + add AuditLog association

Routes/
+   adminRoutes.js              # User admin + dashboard stats routes
    clubRoutes.js               # + add GET /:id, PUT /:id, DELETE /:id routes
    index.js                    # + mount adminRoutes
    matchRoutes.js              # + add GET / (list), POST /:id/schedule, PUT /:id/reschedule, POST /:id/walkover
    playerRoutes.js             # + add GET /:id, PUT /:id, DELETE /:id routes
    tournamentRoutes.js         # + add PUT /:id, DELETE /:id, POST /:id/complete routes

Services/
+   auditService.js             # Replace stub with real AuditLog writes
    clubService.js              # + add update, delete, getById, list with pagination
    matchService.js             # + add list (paginated), schedule, reschedule, walkover
    playerService.js            # + add getById, update, delete, list with pagination
    tournamentService.js        # + add update, markComplete, delete, getById with stats, list with pagination

+   adminService.js             # User admin (list users, assign/revoke TKD role, deactivate/reactivate)

utils/
    pagination.js               # Already exists — will be wired into list services
    validators/
+       adminValidator.js       # Validators for user admin endpoints
        clubValidator.js        # + add updateClubValidation, deleteClubValidation
        matchValidator.js       # + add scheduleMatchValidation, rescheduleMatchValidation, walkoverValidation
        playerValidator.js      # + add updatePlayerValidation, deletePlayerValidation
        tournamentValidator.js  # + add updateTournamentValidation, markCompleteValidation, deleteTournamentValidation

tests/
+   contract/
+       admin.contract.test.js
+       player-crud.contract.test.js
+       club-crud.contract.test.js
+       tournament-crud.contract.test.js
+       match-scheduling.contract.test.js
+       dashboard.contract.test.js
+   integration/
+       admin.test.js
+       player-crud.test.js
+       club-crud.test.js
+       tournament-crud.test.js
+       match-scheduling.test.js
+       dashboard.test.js
+   unit/
+       auditService.test.js
```

**Structure Decision**: Single project structure. All additions follow the existing Express-style three-layer pattern with files placed in existing directories.

## Complexity Tracking

> No constitution violations to justify. All features align with established patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |
