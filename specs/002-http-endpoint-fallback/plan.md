# Implementation Plan: HTTP Endpoint Fallback for WebSocket Failure

**Branch**: `002-http-endpoint-fallback` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-http-endpoint-fallback/spec.md`

## Summary

Add HTTP REST API endpoints as a fallback for WebSocket connections that fail due to network restrictions (firewalls, proxies). The existing match REST API handles state retrieval and match control, but scoring operations (ADD_POINT, REMOVE_POINT, END_ROUND) are currently WebSocket-only. This feature exposes those scoring operations via HTTP POST endpoints, adds per-client rate limiting, and ensures state consistency across both communication channels.

## Technical Context

**Language/Version**: Node.js 18+ (CommonJS modules)

**Primary Dependencies**: Express 5, Sequelize 6 (PostgreSQL), Socket.IO 4.7, express-validator 7, jsonwebtoken

**Storage**: PostgreSQL via Sequelize ORM (existing)

**Testing**: Jest 29 + Supertest 7 (integration), socket.io-client (WebSocket tests)

**Target Platform**: Linux server (Vercel deployment)

**Project Type**: Web service (REST API + WebSocket server)

**Performance Goals**: HTTP endpoint responses ≤500ms for scoring operations; support 100 concurrent HTTP polling clients per match

**Constraints**: Must follow three-layer architecture (Route → Controller → Service); must maintain state consistency with WebSocket channel; must use same auth mechanism (JWT)

**Scale/Scope**: Tournament system with up to 10 concurrent matches; 4 user roles (Admin, Head Judge, Mat Judge, Scorekeeper); match operations only (scoring, match control, state retrieval)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Three-Layer Architecture | ✅ PASS | New endpoints follow Route → Controller → Service pattern |
| II. Sequelize Model Convention | ✅ PASS | No new models; existing Match and MatchEvent models used |
| III. Controller & Handler Discipline | ✅ PASS | Controllers delegate to services; no business logic in handlers |
| IV. Audit Trail & Event Sourcing | ✅ PASS | All scoring operations create MatchEvent records via existing scoringService |
| V. Consistent Response & Error Handling | ✅ PASS | Use existing successResponse/ApiErrors patterns |
| VI. Real-Time WebSocket Discipline | ✅ PASS | WebSocket remains primary; HTTP is fallback only |
| VII. State Machine & Domain Logic Integrity | ✅ PASS | HTTP scoring uses same service methods, same validation |
| VIII. Test-First & Contract Validation | ⚠️ ACTION REQUIRED | Contract tests and integration tests must be written before implementation |
| IX. Postman Collection Accountability | ⚠️ ACTION REQUIRED | Postman collection must be updated with new endpoints |

## Project Structure

### Documentation (this feature)

```text
specs/002-http-endpoint-fallback/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (rest-api.md)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
Routes/
├── matchRoutes.js          # ADD: POST /:id/points, POST /:id/remove-points, POST /:id/end-round
├── healthRoutes.js         # (existing)

Controllers/
├── matchController.js      # ADD: addPoint, removePoint, endRound handlers

Services/
├── matchService.js         # (existing - no changes, already handles state retrieval)
├── scoringService.js       # (existing - no changes, already validates scoring actions)

middlewares/
├── rateLimiter.js          # NEW: per-client rate limiting middleware
├── protect.js              # (existing - JWT auth)
├── tkdProtect.js           # (existing - TKD role auth)
├── tkdRoleGuard.js         # (existing - role-based access)
├── validatorMiddleware.js  # (existing - express-validator)

utils/
├── validators/
│   ├── matchValidator.js   # NEW: validation rules for scoring endpoints

tests/
├── contract/
│   └── http-fallback.test.js  # NEW: contract tests for HTTP endpoints
├── integration/
│   └── http-fallback.test.js  # NEW: integration tests for HTTP scoring
└── unit/
    └── rateLimiter.test.js    # NEW: unit tests for rate limiter

postman/
└── collection.json         # UPDATE: add new scoring HTTP endpoints
```

**Structure Decision**: Follows existing project layout. No structural changes needed — new endpoints added to existing matchRoutes.js and matchController.js. New rate limiter middleware added to middlewares/. New validator file in utils/validators/.

## Complexity Tracking

> No Constitution Check violations requiring justification. All new code follows existing patterns.
