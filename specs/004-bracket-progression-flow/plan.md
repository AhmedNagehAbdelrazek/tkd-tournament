# Implementation Plan: Bracket Progression Flow

**Branch**: `main` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-bracket-progression-flow/spec.md`

## Summary

Implement the automatic progression engine that advances winners from finished matches into their next match slots, builds a nested bracket tree from flat database records, and exposes it via a GET endpoint. Handles variable bracket sizes (bye matches), ensures BRACKET:UPDATED broadcast on progression, and supports manual Head Judge override for edge cases.

## Technical Context

**Language/Version**: Node.js 18+ (CommonJS modules)

**Primary Dependencies**: Express 5, Sequelize 6 (PostgreSQL), Socket.IO 4.7, jsonwebtoken

**Storage**: PostgreSQL via Sequelize ORM (existing Match and Player models with new fields: `nextMatchId`, `nextMatchSlot`, `stageName`, `bracketPosition`, `endReason` on Match; `seed` on Player)

**Testing**: Jest 29 + Supertest 7 (integration), socket.io-client (WebSocket/Bracket events)

**Target Platform**: Linux server (Vercel deployment)

**Project Type**: Web service (REST API + WebSocket server)

**Performance Goals**: Bracket tree response ≤2s for 64 players; progression engine advances winner within 1s of match finish

**Constraints**: Must follow three-layer architecture (Route → Controller → Service); progression engine fires synchronously on match FINISHED transition; bracket tree uses flat-to-nested transformation

**Scale/Scope**: Single-elimination brackets only; max 64 players per bracket; all weight classes and genders supported

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Three-Layer Architecture | ✅ PASS | New BracketService and BracketController; progression hook in existing MatchService |
| II. Sequelize Model Convention | ✅ PASS | New Match fields (nextMatchId, nextMatchSlot, stageName, bracketPosition, endReason) follow existing UUID/ENUM patterns |
| III. Controller & Handler Discipline | ✅ PASS | GET /api/tournaments/:id/bracket controller delegates to BracketService |
| IV. Audit Trail & Event Sourcing | ✅ PASS | Progression engine records via MatchEvent; progression is not a mutation but a downstream effect |
| V. Consistent Response & Error Handling | ✅ PASS | Bracket tree response uses existing successResponse pattern |
| VI. Real-Time WebSocket Discipline | ✅ PASS | BRACKET:UPDATED broadcasts follow existing Socket.IO room patterns |
| VII. State Machine & Domain Logic Integrity | ✅ PASS | Progression triggers on FINISHED transition only; guard conditions prevent invalid advancement |
| VIII. Test-First & Contract Validation | ⚠️ ACTION REQUIRED | Contract tests for bracket endpoint and progression engine unit tests required |
| IX. Postman Collection Accountability | ⚠️ ACTION REQUIRED | Postman collection must be updated with GET /api/tournaments/:id/bracket endpoint |

## Project Structure

### Documentation (this feature)

```text
specs/004-bracket-progression-flow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── rest-api.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── models/
│   └── Match.js                    # Add nextMatchId, nextMatchSlot, stageName, bracketPosition, endReason fields
│   └── Player.js                   # Add seed field
├── services/
│   ├── BracketService.js           # NEW: bracket generation, progression engine, flat-to-nested tree
│   └── MatchService.js             # Update: add progression hook after match finish
├── routes/
│   └── tournament.routes.js        # Add GET /:id/bracket route
├── controllers/
│   └── BracketController.js        # NEW: bracket tree endpoint handler
├── utils/
│   └── validators/
│       └── bracket.validator.js    # NEW: validators for bracket endpoints
└── sockets/
    └── match.socket.js             # Update: emit BRACKET:UPDATED on match finish

tests/
├── unit/
│   └── BracketService.test.js      # NEW: progression engine, tree transformation
├── integration/
│   └── bracket.test.js             # NEW: bracket endpoint integration tests
└── contract/
    └── bracket.contract.test.js    # NEW: bracket response shape validation
```

**Structure Decision**: Single project (existing Express application). All new code follows the established three-layer architecture under `src/`. The BracketService is a new service; MatchService gets a progression hook in its existing finish-match flow.

## Complexity Tracking

No Constitution violations expected — progression engine fits cleanly into existing 3-layer architecture.
