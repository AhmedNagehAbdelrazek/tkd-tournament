# REST API Contract: Admin Dashboard Mutations

Base URL: `/api`

Authentication: All endpoints require `Authorization: Bearer <JWT>` header unless noted.

## Player Management

### GET /api/players/:id — Get player by ID

**Auth**: Any authenticated user
**Params**: `id` (INTEGER) — player ID

**Response 200**:
```json
{
  "id": 1,
  "name": "Kim Taekwondo",
  "dob": "2000-05-15",
  "weight": 68.5,
  "gender": "MALE",
  "seed": null,
  "photoUrl": null,
  "age": 26,
  "clubId": 3,
  "clubName": "Seoul Tigers",
  "tournamentId": 1
}
```

**Errors**: 404 NOT_FOUND — Player not found

---

### PUT /api/players/:id — Update player

**Auth**: Global admin role
**Params**: `id` (INTEGER) — player ID
**Body** (all optional):
```json
{
  "name": "New Name",
  "dob": "2000-05-15",
  "weight": 70.0,
  "gender": "MALE",
  "clubId": 5,
  "seed": 3,
  "photoUrl": "https://..."
}
```

**Response 200**: Updated player object (same shape as GET)

**Errors**: 400 BAD_REQUEST — Invalid fields; 404 NOT_FOUND — Player or Club not found; 422 VALIDATION_ERROR — Weight out of range for tournament

---

### DELETE /api/players/:id — Delete player

**Auth**: Global admin role
**Params**: `id` (INTEGER) — player ID

**Response 200**:
```json
{ "message": "Player deleted successfully" }
```

**Errors**: 404 NOT_FOUND — Player not found; 409 CONFLICT — Player has active matches (SCHEDULED or IN_PROGRESS)

---

### GET /api/players — List players (with pagination)

**Auth**: Any authenticated user
**Query**:
| Param        | Type    | Default | Description                    |
| ------------ | ------- | ------- | ------------------------------ |
| page         | INTEGER | 1       | Page number                    |
| limit        | INTEGER | 20      | Items per page (max 100)       |
| tournamentId | INTEGER | —       | Filter by tournament           |
| clubId       | INTEGER | —       | Filter by club                 |
| gender       | STRING  | —       | Filter by gender (MALE/FEMALE) |
| weightClass  | STRING  | —       | Filter by weight class name    |

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Kim Taekwondo",
      "dob": "2000-05-15",
      "weight": 68.5,
      "gender": "MALE",
      "clubId": 3,
      "clubName": "Seoul Tigers",
      "tournamentId": 1,
      "photoUrl": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### POST /api/players/bulk — Bulk create players

**Auth**: Global admin role
**Body**:
```json
{
  "players": [
    { "name": "Player 1", "dob": "2000-01-01", "weight": 65.0, "gender": "MALE", "clubId": 1, "tournamentId": 1 },
    { "name": "Player 2", "dob": "1999-06-15", "weight": 58.0, "gender": "FEMALE", "clubId": 2, "tournamentId": 1 }
  ]
}
```

**Response 201**:
```json
{
  "created": 2,
  "players": [ { "id": 10, "name": "Player 1", ... }, { "id": 11, "name": "Player 2", ... } ]
}
```

**Errors**: 422 VALIDATION_ERROR — Duplicate names within same tournament (batch rejected entirely):
```json
{
  "status": "error",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "index": 2, "name": "Player 3", "error": "Duplicate name within tournament" }
  ]
}
```

---

## Club Management

### GET /api/clubs/:id — Get club by ID

**Auth**: Any authenticated user
**Params**: `id` (INTEGER) — club ID

**Response 200**:
```json
{
  "id": 1,
  "name": "Seoul Tigers",
  "playerCount": 12
}
```

**Errors**: 404 NOT_FOUND — Club not found

---

### PUT /api/clubs/:id — Update club

**Auth**: Global admin role
**Params**: `id` (INTEGER) — club ID
**Body**:
```json
{ "name": "Updated Club Name" }
```

**Response 200**: Updated club object (same shape as GET)

**Errors**: 404 NOT_FOUND — Club not found; 409 CONFLICT — Club name already taken

---

### DELETE /api/clubs/:id — Delete club

**Auth**: Global admin role
**Params**: `id` (INTEGER) — club ID

**Response 200**:
```json
{ "message": "Club deleted successfully" }
```

**Errors**: 404 NOT_FOUND — Club not found; 409 CONFLICT — Club has assigned players

---

### GET /api/clubs — List clubs (with pagination)

**Auth**: Any authenticated user
**Query**:
| Param  | Type    | Default | Description              |
| ------ | ------- | ------- | ------------------------ |
| page   | INTEGER | 1       | Page number              |
| limit  | INTEGER | 20      | Items per page (max 100) |
| search | STRING  | —       | Filter by name (partial) |

**Response 200**:
```json
{
  "data": [
    { "id": 1, "name": "Seoul Tigers", "playerCount": 12 }
  ],
  "meta": { "page": 1, "limit": 20, "total": 25, "totalPages": 2 }
}
```

---

## Tournament Management

### PUT /api/tournaments/:id — Update tournament

**Auth**: Global admin role
**Params**: `id` (INTEGER) — tournament ID
**Body**:
```json
{
  "name": "Updated Tournament Name",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03"
}
```

**Response 200**: Updated tournament object

**Errors**: 404 NOT_FOUND — Tournament not found; 400 BAD_REQUEST — Tournament is already completed

---

### POST /api/tournaments/:id/complete — Mark tournament as completed

**Auth**: Global admin role
**Params**: `id` (INTEGER) — tournament ID

**Response 200**:
```json
{
  "id": 1,
  "name": "Spring Open 2026",
  "isCompleted": true,
  ...
}
```

**Errors**: 404 NOT_FOUND — Tournament not found; 409 CONFLICT — Tournament has matches still IN_PROGRESS

---

### DELETE /api/tournaments/:id — Delete tournament

**Auth**: Global admin role
**Params**: `id` (INTEGER) — tournament ID

**Response 200**:
```json
{ "message": "Tournament deleted successfully" }
```

**Errors**: 404 NOT_FOUND — Tournament not found; 409 CONFLICT — Tournament has associated players or matches

---

### GET /api/tournaments/:id — Get tournament with stats

**Auth**: Any authenticated user
**Params**: `id` (INTEGER) — tournament ID

**Response 200**:
```json
{
  "id": 1,
  "name": "Spring Open 2026",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03",
  "settings": { ... },
  "isCompleted": false,
  "stats": {
    "playerCount": 64,
    "matchCount": 63,
    "matchesByStatus": {
      "SCHEDULED": 48,
      "IN_PROGRESS": 2,
      "FINISHED": 13,
      "CANCELLED": 0
    }
  }
}
```

**Errors**: 404 NOT_FOUND — Tournament not found

---

### GET /api/tournaments — List tournaments (with pagination)

**Auth**: Any authenticated user
**Query**:
| Param     | Type    | Default | Description                        |
| --------- | ------- | ------- | ---------------------------------- |
| page      | INTEGER | 1       | Page number                        |
| limit     | INTEGER | 20      | Items per page (max 100)           |
| completed | BOOLEAN | —       | Filter by completion status        |
| startDate | STRING  | —       tournaments starting after this date |
| endDate   | STRING  | —       | Tournaments ending before this date |

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Spring Open 2026",
      "startDate": "2026-08-01",
      "endDate": "2026-08-03",
      "isCompleted": false,
      "playerCount": 64,
      "matchCount": 63
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

## Match Management

### GET /api/matches — List matches for a tournament (with pagination)

**Auth**: Any authenticated user
**Query**:
| Param        | Type    | Default | Description                         |
| ------------ | ------- | ------- | ----------------------------------- |
| tournamentId | INTEGER | REQUIRED | Tournament ID                      |
| page         | INTEGER | 1       | Page number                         |
| limit        | INTEGER | 20      | Items per page (max 100)            |
| status       | STRING  | —       | Filter by status                    |
| weightClass  | STRING  | —       | Filter by weight class              |
| bracketRound | INTEGER | —       | Filter by bracket round             |

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "tournamentId": 1,
      "type": "SINGLE_ELIMINATION",
      "player1Id": 10,
      "player2Id": 15,
      "player1Name": "Kim Taekwondo",
      "player2Name": "Park Fighter",
      "scheduledTime": "2026-08-01T10:00:00Z",
      "status": "SCHEDULED",
      "weightClass": "Male -68kg",
      "bracketRound": 1
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 48, "totalPages": 3 }
}
```

---

### POST /api/matches/schedule — Manually schedule a match

**Auth**: Global admin role or HEAD_JUDGE TKD role
**Body**:
```json
{
  "tournamentId": 1,
  "player1Id": 10,
  "player2Id": 15,
  "scheduledTime": "2026-08-01T10:00:00Z",
  "type": "FRIENDLY",
  "weightClass": "Male -68kg"
}
```

**Response 201**: Created match object

**Errors**: 400 BAD_REQUEST — Players are the same; 404 NOT_FOUND — Tournament or Player not found; 409 CONFLICT — Player has a scheduling conflict; 422 VALIDATION_ERROR — scheduledTime is in the past

---

### PUT /api/matches/:id/reschedule — Reschedule a match

**Auth**: Global admin role or HEAD_JUDGE TKD role
**Params**: `id` (INTEGER) — match ID
**Body**:
```json
{
  "scheduledTime": "2026-08-01T14:00:00Z"
}
```

**Response 200**: Updated match object

**Errors**: 404 NOT_FOUND — Match not found; 409 CONFLICT — Match not SCHEDULED or player has scheduling conflict; 422 VALIDATION_ERROR — scheduledTime is in the past

---

### POST /api/matches/:id/cancel — Cancel a match

**Auth**: Global admin role (for SCHEDULED or IN_PROGRESS matches)
**Params**: `id` (INTEGER) — match ID

**Response 200**:
```json
{ "message": "Match cancelled successfully", "matchId": 1 }
```

**Errors**: 404 NOT_FOUND — Match not found; 409 CONFLICT — Match already FINISHED or CANCELLED

---

### POST /api/matches/:id/walkover — Assign walkover result

**Auth**: Global admin role or HEAD_JUDGE TKD role
**Params**: `id` (INTEGER) — match ID
**Body**:
```json
{
  "winnerId": 10,
  "endReason": "WALKOVER"
}
```

**Response 200**: Updated match object with status FINISHED

**Errors**: 404 NOT_FOUND — Match not found; 400 BAD_REQUEST — Winner is not one of the match players; 409 CONFLICT — Match already FINISHED or CANCELLED

---

### GET /api/matches/:id — Get match details with event history

**Auth**: Any authenticated user
**Params**: `id` (INTEGER) — match ID

**Response 200**:
```json
{
  "id": 1,
  "tournamentId": 1,
  "type": "SINGLE_ELIMINATION",
  "player1Id": 10,
  "player2Id": 15,
  "player1Name": "Kim Taekwondo",
  "player2Name": "Park Fighter",
  "scheduledTime": "2026-08-01T10:00:00Z",
  "endTime": null,
  "status": "SCHEDULED",
  "winnerId": null,
  "currentRound": 1,
  "scorePlayer1": 0,
  "scorePlayer2": 0,
  "weightClass": "Male -68kg",
  "bracketRound": 1,
  "events": []
}
```

**Errors**: 404 NOT_FOUND — Match not found

---

## User Administration

### GET /api/admin/users — List all users

**Auth**: Super admin global role
**Query**:
| Param  | Type    | Default | Description              |
| ------ | ------- | ------- | ------------------------ |
| page   | INTEGER | 1       | Page number              |
| limit  | INTEGER | 20      | Items per page (max 100) |

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin User",
      "globalRole": "admin",
      "tkdRole": "ADMIN",
      "isActive": true,
      "createdAt": "2026-01-15T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
}
```

---

### PUT /api/admin/users/:id/role — Assign or revoke TKD role

**Auth**: Super admin global role
**Params**: `id` (INTEGER) — user ID
**Body**:
```json
{
  "tkdRole": "MAT_JUDGE"
}
```
To revoke: `{ "tkdRole": null }`

**Response 200**:
```json
{
  "id": 42,
  "email": "judge@example.com",
  "tkdRole": "MAT_JUDGE"
}
```

**Errors**: 404 NOT_FOUND — User not found; 422 VALIDATION_ERROR — Invalid TKD role value

---

### PUT /api/admin/users/:id/deactivate — Deactivate user

**Auth**: Super admin global role
**Params**: `id` (INTEGER) — user ID

**Response 200**:
```json
{
  "id": 42,
  "email": "user@example.com",
  "isActive": false
}
```

**Errors**: 404 NOT_FOUND — User not found; 409 CONFLICT — User is assigned as judge on an IN_PROGRESS match

---

### PUT /api/admin/users/:id/reactivate — Reactivate user

**Auth**: Super admin global role
**Params**: `id` (INTEGER) — user ID

**Response 200**:
```json
{
  "id": 42,
  "email": "user@example.com",
  "isActive": true
}
```

**Errors**: 404 NOT_FOUND — User not found

---

## Dashboard Overview

### GET /api/dashboard/tournaments/:id/overview — Tournament stats

**Auth**: Any authenticated user
**Params**: `id` (INTEGER) — tournament ID

**Response 200**:
```json
{
  "tournamentId": 1,
  "tournamentName": "Spring Open 2026",
  "totalPlayers": 64,
  "totalMatches": 63,
  "matchesByStatus": {
    "SCHEDULED": 48,
    "IN_PROGRESS": 2,
    "FINISHED": 13,
    "PAUSED": 0,
    "CANCELLED": 0
  },
  "upcomingMatches": [
    {
      "id": 25,
      "player1Name": "Kim Taekwondo",
      "player2Name": "Park Fighter",
      "scheduledTime": "2026-08-01T10:30:00Z",
      "weightClass": "Male -68kg"
    }
  ]
}
```

---

### GET /api/dashboard/tournaments — Tournament list with status

**Auth**: Any authenticated user
**Query**:
| Param  | Type    | Default | Description              |
| ------ | ------- | ------- | ------------------------ |
| page   | INTEGER | 1       | Page number              |
| limit  | INTEGER | 20      | Items per page (max 100) |

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Spring Open 2026",
      "startDate": "2026-08-01",
      "endDate": "2026-08-03",
      "isCompleted": false,
      "playerCount": 64,
      "matchCount": 63
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```
