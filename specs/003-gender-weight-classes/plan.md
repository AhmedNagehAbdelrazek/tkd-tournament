# Implementation Plan: Gender-Specific Weight Classes

**Branch**: `003-gender-weight-classes` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-gender-weight-classes/spec.md`

## Summary

Update tournament settings to store weight classes organized by gender (MALE/FEMALE) instead of a flat array. Each gender has its own independent list of weight classes with no cross-gender mixing. Players whose weight doesn't match any weight class for their gender are identified as excluded, with full details and reasons returned in tournament create/update responses and via a dedicated endpoint. Weight class settings are locked once any match reaches IN_PROGRESS status.

## Technical Context

**Language/Version**: Node.js (CommonJS modules)

**Primary Dependencies**: Express 5, Sequelize 6 (PostgreSQL), express-validator 7

**Storage**: PostgreSQL via Sequelize ORM — JSONB `settings` field on Tournament model

**Testing**: Jest 29 + Supertest 7

**Target Platform**: Node.js server (Vercel deployment)

**Project Type**: Web service (REST API)

**Performance Goals**: Excluded player evaluation completes within 5 seconds for up to 500 registered players

**Constraints**: Breaking change to `settings.weightClasses` structure; existing flat arrays must be handled gracefully

**Scale/Scope**: Single tournament with up to ~500 players; weight class evaluation is per-tournament

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Three-Layer Architecture | ✅ PASS | Changes follow Route → Controller → Service → Model pattern |
| II. Sequelize Model Convention | ✅ PASS | No model schema changes; JSONB field used for settings |
| III. Controller & Handler Discipline | ✅ PASS | Controllers remain thin delegates to services |
| IV. Audit Trail & Event Sourcing | ⚠️ DEFERRED | Weight class changes are settings mutations, not match events. No MatchEvent needed. Audit via tournament update is sufficient. |
| V. Consistent Response & Error Handling | ✅ PASS | Excluded players returned via `successResponse()`; errors via `ApiErrors.*` |
| VI. Real-Time WebSocket Discipline | N/A | No WebSocket changes in this feature |
| VII. State Machine & Domain Logic Integrity | ✅ PASS | Tournament lock on IN_PROGRESS matches adds state guard |
| VIII. Test-First & Contract Validation | ✅ PASS | Tests to be written per constitution |
| IX. Postman Collection Accountability | ✅ PASS | New endpoint to be added to Postman collection |

**Gate Result**: PASS — no unjustified violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-gender-weight-classes/
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
Controllers/
├── tournamentController.js    # Add updateSettings, getExcludedPlayers
├── playerController.js        # No changes needed

Services/
├── tournamentService.js       # Update create, updateSettings; add getExcludedPlayers, findExcludedPlayers
├── playerService.js           # Update validateWeight for gender-keyed classes; add gender filter to list weight class
├── matchmakingService.js      # Update generateBracket to use gender-keyed weight classes

Routes/
├── tournamentRoutes.js        # Add PUT /:id/settings, GET /:id/excluded-players
├── playerRoutes.js            # No changes needed

utils/validators/
├── tournamentValidator.js     # Update validation for gender-keyed weightClasses
├── playerValidator.js         # No changes needed

config/
├── constants.js               # No changes needed (GENDERS already exists)

tests/
├── integration/
│   ├── tournament-gender-weight.test.js   # New: integration tests
│   └── player-gender-weight.test.js       # New: player registration tests
├── unit/
│   └── weight-class-validation.test.js    # New: unit tests for gender-aware validation
```

**Structure Decision**: Single project layout. Changes span Services, Controllers, Routes, and Validators within the existing codebase structure. No new models needed — the gender-keyed structure lives in the existing JSONB `settings` field.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
