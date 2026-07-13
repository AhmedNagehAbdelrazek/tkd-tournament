# Quickstart: HTTP Endpoint Fallback

**Date**: 2026-07-13

## Overview

This feature adds HTTP REST endpoints as a fallback for WebSocket scoring operations. When a client cannot establish a WebSocket connection (firewall, proxy), it can use HTTP POST endpoints to submit scoring actions and GET endpoints to retrieve match state.

## New Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/matches/:id/points` | tkdProtect | MAT_JUDGE | Add points to a player |
| POST | `/api/matches/:id/remove-points` | tkdProtect | MAT_JUDGE | Remove points from a player |
| POST | `/api/matches/:id/end-round` | tkdProtect | MAT_JUDGE | End current round |
| GET | `/api/matches/:id` | tkdProtect | any | Get full match state (existing, used for polling) |

## Request Bodies

### POST /api/matches/:id/points
```json
{
  "playerId": 1,
  "points": 3,
  "roundNumber": 2
}
```

### POST /api/matches/:id/remove-points
```json
{
  "playerId": 1,
  "points": 1,
  "roundNumber": 2
}
```

### POST /api/matches/:id/end-round
```json
{
  "roundNumber": 2
}
```

## Response Format

All endpoints return the full match state on success:

```json
{
  "data": {
    "id": 1,
    "tournamentId": 1,
    "status": "IN_PROGRESS",
    "currentRound": 2,
    "scorePlayer1": 5,
    "scorePlayer2": 3,
    "player1": { "id": 1, "name": "Alice", "club": { "id": 1, "name": "Club A" } },
    "player2": { "id": 2, "name": "Bob", "club": { "id": 2, "name": "Club B" } },
    "latestEvent": { "type": "ADD_POINT", "createdAt": "2026-07-13T12:00:00Z" }
  }
}
```

## Rate Limiting

- **Limit**: 2 requests per second per client per endpoint
- **Exceeded response**: HTTP 429 with `Retry-After: 1` header
- **Client identity**: JWT userId + endpoint path

## Client Fallback Flow

1. Client attempts WebSocket connection to `/live-matches`
2. If connection times out (configurable, default 5s), client switches to HTTP polling
3. Client polls `GET /api/matches/:id` every 1 second for state updates
4. Client submits scoring actions via POST endpoints
5. When WebSocket becomes available, client may switch back

## Files to Create/Modify

| File | Action |
|------|--------|
| `Routes/matchRoutes.js` | ADD 3 new POST routes |
| `Controllers/matchController.js` | ADD 3 new controller methods |
| `middlewares/rateLimiter.js` | CREATE rate limiting middleware |
| `utils/validators/matchValidator.js` | CREATE validation rules |
| `tests/contract/http-fallback.test.js` | CREATE contract tests |
| `tests/integration/http-fallback.test.js` | CREATE integration tests |
| `tests/unit/rateLimiter.test.js` | CREATE unit tests |
| `postman/collection.json` | UPDATE with new endpoints |

## Testing

```bash
# Run all tests
npm test

# Run contract tests only
npm run test:contract

# Run integration tests only
npm run test:integration

# Run unit tests only
npm run test:unit
```

## Environment Variables

No new environment variables required. Rate limiter defaults are configurable in code.
