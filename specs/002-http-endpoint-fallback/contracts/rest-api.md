# REST API Contracts: HTTP Endpoint Fallback

**Date**: 2026-07-13

## Base URL

All endpoints are relative to the existing API base path: `/api`

## Authentication

All endpoints require TKD authentication via Bearer token:
```
Authorization: Bearer <jwt_token>
```

Token must contain valid `tkdRole` claim. Role-based access is enforced per endpoint.

---

## POST /api/matches/:id/points

Add points to a player in a live match.

**Role**: MAT_JUDGE only

**Rate Limit**: 2 requests/second per client

### Request

**Path Parameters**:
- `id` (integer, required) — Match ID

**Body** (JSON):
```json
{
  "playerId": 1,
  "points": 3,
  "roundNumber": 2
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| playerId | integer | yes | Must belong to this match | Player receiving points |
| points | integer | yes | ≥ 1 | Points to add |
| roundNumber | integer | no | 1–3 | Round being scored (defaults to current round) |

### Response

**Success (200)**:
```json
{
  "data": {
    "id": 1,
    "tournamentId": 1,
    "status": "IN_PROGRESS",
    "currentRound": 2,
    "scorePlayer1": 8,
    "scorePlayer2": 3,
    "winnerId": null,
    "player1": {
      "id": 1,
      "name": "Alice",
      "club": { "id": 1, "name": "Club A" }
    },
    "player2": {
      "id": 2,
      "name": "Bob",
      "club": { "id": 2, "name": "Club B" }
    },
    "latestEvent": {
      "id": 15,
      "type": "ADD_POINT",
      "playerId": 1,
      "points": 3,
      "roundNumber": 2,
      "createdAt": "2026-07-13T12:00:00Z"
    }
  }
}
```

**Auto-End by Point Gap (200)**:
When adding points triggers the point gap threshold, match ends automatically:
```json
{
  "data": {
    "id": 1,
    "status": "FINISHED",
    "winnerId": 1,
    "scorePlayer1": 23,
    "scorePlayer2": 3,
    "latestEvent": {
      "type": "AUTO_END_BY_GAP",
      "metadata": { "gapThreshold": 20 }
    }
  }
}
```

**Error Responses**:

| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | Invalid or missing token |
| 403 | FORBIDDEN | Role not authorized for scoring |
| 404 | NOT_FOUND | Match not found |
| 409 | CONFLICT | Match is not in progress |
| 422 | VALIDATION_ERROR | Invalid input (player not in match, points < 1, etc.) |
| 429 | RATE_LIMITED | Too many requests (Retry-After: 1) |

---

## POST /api/matches/:id/remove-points

Remove points from a player in a live match.

**Role**: MAT_JUDGE only

**Rate Limit**: 2 requests/second per client

### Request

**Path Parameters**:
- `id` (integer, required) — Match ID

**Body** (JSON):
```json
{
  "playerId": 1,
  "points": 1,
  "roundNumber": 2
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| playerId | integer | yes | Must belong to this match | Player losing points |
| points | integer | yes | ≥ 1 | Points to remove |
| roundNumber | integer | no | 1–3 | Round being scored (defaults to current round) |

### Response

**Success (200)**:
```json
{
  "data": {
    "id": 1,
    "tournamentId": 1,
    "status": "IN_PROGRESS",
    "currentRound": 2,
    "scorePlayer1": 4,
    "scorePlayer2": 3,
    "winnerId": null,
    "player1": {
      "id": 1,
      "name": "Alice",
      "club": { "id": 1, "name": "Club A" }
    },
    "player2": {
      "id": 2,
      "name": "Bob",
      "club": { "id": 2, "name": "Club B" }
    },
    "latestEvent": {
      "id": 16,
      "type": "REMOVE_POINT",
      "playerId": 1,
      "points": 1,
      "roundNumber": 2,
      "createdAt": "2026-07-13T12:00:05Z"
    }
  }
}
```

**Error Responses**: Same as POST /api/matches/:id/points

---

## POST /api/matches/:id/end-round

End the current round and advance to the next round.

**Role**: MAT_JUDGE only

**Rate Limit**: 1 request/second per client

### Request

**Path Parameters**:
- `id` (integer, required) — Match ID

**Body** (JSON):
```json
{
  "roundNumber": 2
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| roundNumber | integer | no | 1–3 | Current round being ended (defaults to current round) |

### Response

**Success (200)**:
```json
{
  "data": {
    "id": 1,
    "tournamentId": 1,
    "status": "IN_PROGRESS",
    "currentRound": 3,
    "scorePlayer1": 8,
    "scorePlayer2": 5,
    "winnerId": null,
    "player1": {
      "id": 1,
      "name": "Alice",
      "club": { "id": 1, "name": "Club A" }
    },
    "player2": {
      "id": 2,
      "name": "Bob",
      "club": { "id": 2, "name": "Club B" }
    },
    "latestEvent": {
      "id": 17,
      "type": "END_ROUND",
      "roundNumber": 2,
      "createdAt": "2026-07-13T12:01:00Z"
    }
  }
}
```

**Error Responses**:

| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | Invalid or missing token |
| 403 | FORBIDDEN | Role not authorized for scoring |
| 404 | NOT_FOUND | Match not found |
| 409 | CONFLICT | Match is not in progress or already at max rounds |
| 422 | VALIDATION_ERROR | Invalid round number |
| 429 | RATE_LIMITED | Too many requests (Retry-After: 1) |

---

## GET /api/matches/:id

Retrieve full match state. Used for HTTP polling.

**Role**: Any authenticated TKD user

**Rate Limit**: 10 requests/second per client (higher limit for polling)

### Request

**Path Parameters**:
- `id` (integer, required) — Match ID

### Response

**Success (200)**:
```json
{
  "data": {
    "id": 1,
    "tournamentId": 1,
    "type": "SINGLE_ELIMINATION",
    "status": "IN_PROGRESS",
    "currentRound": 2,
    "scorePlayer1": 5,
    "scorePlayer2": 3,
    "winnerId": null,
    "scheduledTime": "2026-07-13T14:00:00Z",
    "intraClubWarning": false,
    "bracketRound": 1,
    "weightClass": "68-74",
    "player1": {
      "id": 1,
      "name": "Alice",
      "weight": 72.5,
      "gender": "FEMALE",
      "club": { "id": 1, "name": "Club A" }
    },
    "player2": {
      "id": 2,
      "name": "Bob",
      "weight": 71.8,
      "gender": "MALE",
      "club": { "id": 2, "name": "Club B" }
    },
    "latestEvent": {
      "id": 15,
      "type": "ADD_POINT",
      "playerId": 1,
      "points": 3,
      "roundNumber": 2,
      "createdAt": "2026-07-13T12:00:00Z"
    }
  }
}
```

**Error Responses**:

| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | Invalid or missing token |
| 404 | NOT_FOUND | Match not found |
