# Implementation Plan: Taekwondo Match Management System

**Branch**: `001-tkd-match-system` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tkd-match-system/spec.md`

## Summary

A real-time backend system for managing Taekwondo tournaments with player registration, automated matchmaking with club avoidance logic, and live match execution via WebSockets. The system enforces business rules (gender separation, weight classes, rest periods) and acts as the Single Source of Truth for live scoring.

## Technical Context

**Language/Version**: Node.js 18+ with TypeScript

**Primary Dependencies**: Express.js, Sequelize ORM, Socket.io, jsonwebtoken, bcryptjs

**Storage**: PostgreSQL

**Testing**: Jest, Supertest, Socket.io-client (test)

**Target Platform**: Linux/Windows server (Node.js runtime)

**Project Type**: web-service (REST API + WebSocket server)

**Performance Goals**: Scoring updates ≤500ms, state sync ≤2s, bracket generation ≤10s

**Constraints**: 10+ concurrent matches, 500ms scoring latency, 15-minute rest period enforcement

**Scale/Scope**: Single tournament operator, 64 players per bracket, 10 concurrent matches

## Constitution Check

*No constitution file found. Proceeding with standard best practices.*

- Security: JWT authentication with role-based access control
- Data integrity: Database constraints and validation
- Audit trail: MatchEvent logging for all state changes
- Real-time reliability: WebSocket reconnection with state sync

## Project Structure

### Documentation (this feature)

```text
specs/001-tkd-match-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── rest-api.md
│   └── websocket.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── socket.ts
│   │   └── auth.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Club.ts
│   │   ├── Tournament.ts
│   │   ├── Player.ts
│   │   ├── Match.ts
│   │   └── MatchEvent.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── tournamentService.ts
│   │   ├── playerService.ts
│   │   ├── matchmakingService.ts
│   │   ├── matchService.ts
│   │   └── scoringService.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rbac.ts
│   │   └── validation.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── tournament.routes.ts
│   │   ├── player.routes.ts
│   │   └── match.routes.ts
│   ├── socket/
│   │   ├── handlers/
│   │   │   ├── scoring.handler.ts
│   │   │   └── match.handler.ts
│   │   └── middleware/
│   │       └── socketAuth.ts
│   ├── utils/
│   │   ├── ageCalculator.ts
│   │   └── restPeriodValidator.ts
│   └── app.ts
├── tests/
│   ├── unit/
│   │   ├── matchmaking.test.ts
│   │   ├── scoring.test.ts
│   │   └── restPeriod.test.ts
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── tournament.test.ts
│   │   ├── player.test.ts
│   │   └── match.test.ts
│   └── socket/
│       └── scoring.test.ts
├── package.json
├── tsconfig.json
└── .env.example
```

**Structure Decision**: Backend-only web service with REST API and WebSocket server. Frontend is separate implementation (not in scope).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| WebSocket server | Real-time scoring requires bidirectional communication | HTTP polling would exceed 500ms latency requirement |
| Club avoidance algorithm | Business rule with 3-tier fallback logic | Simple same-club check insufficient for edge cases |
