# REST API Contract: Taekwondo Match Management System

**Base URL**: `/api`

**Authentication**: Bearer JWT token in Authorization header

**Content-Type**: `application/json`

## Authentication

### POST /auth/login

**Purpose**: Authenticate user and receive JWT token

**Request**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200)**:
```json
{
  "token": "string",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "ADMIN | HEAD_JUDGE | MAT_JUDGE | SCOREKEEPER"
  }
}
```

**Errors**:
- 401: Invalid credentials
- 400: Missing required fields

---

## Tournaments

### POST /tournaments

**Purpose**: Create a new tournament

**Authorization**: ADMIN only

**Request**:
```json
{
  "name": "string",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03",
  "settings": {
    "roundDurationSec": 120,
    "restBetweenRoundsSec": 60,
    "restBetweenMatchesMin": 15,
    "pointGapAutoEnd": 20,
    "weightClasses": [
      {"name": "10-15kg", "min": 10, "max": 15},
      {"name": "15-20kg", "min": 15, "max": 20}
    ]
  }
}
```

**Response (201)**:
```json
{
  "id": "uuid",
  "name": "string",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03",
  "settings": {...},
  "createdAt": "timestamp"
}
```

**Errors**:
- 403: Not authorized
- 400: Invalid settings schema

### GET /tournaments/:id

**Purpose**: Get tournament details and settings

**Authorization**: All authenticated users

**Response (200)**:
```json
{
  "id": "uuid",
  "name": "string",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03",
  "settings": {...},
  "isCompleted": false,
  "playerCount": 42,
  "matchCount": 21
}
```

**Errors**:
- 404: Tournament not found

### GET /tournaments

**Purpose**: List all tournaments

**Authorization**: All authenticated users

**Query Params**:
- `completed`: boolean (filter by completion status)

**Response (200)**:
```json
{
  "tournaments": [...],
  "total": 5
}
```

---

## Players

### POST /players

**Purpose**: Register a single player

**Authorization**: ADMIN only

**Request**:
```json
{
  "tournamentId": "uuid",
  "name": "string",
  "dob": "2010-05-15",
  "weight": 45.5,
  "gender": "MALE | FEMALE",
  "clubId": "uuid",
  "photoUrl": "string (optional)"
}
```

**Response (201)**:
```json
{
  "id": "uuid",
  "name": "string",
  "dob": "2010-05-15",
  "age": 16,
  "yearOfBirth": 2010,
  "weight": 45.5,
  "gender": "MALE",
  "clubId": "uuid",
  "clubName": "string",
  "tournamentId": "uuid",
  "photoUrl": "string"
}
```

**Errors**:
- 400: Weight outside tournament weight classes
- 400: Club not found
- 403: Not authorized

### POST /players/bulk

**Purpose**: Register multiple players (frontend parses Excel)

**Authorization**: ADMIN only

**Request**:
```json
{
  "tournamentId": "uuid",
  "players": [
    {
      "name": "string",
      "dob": "2010-05-15",
      "weight": 45.5,
      "gender": "MALE",
      "clubId": "uuid"
    }
  ]
}
```

**Response (201)**:
```json
{
  "created": 15,
  "errors": [
    {"index": 3, "reason": "Weight outside range"}
  ]
}
```

### GET /players

**Purpose**: List players in a tournament

**Authorization**: All authenticated users

**Query Params**:
- `tournamentId`: uuid (required)
- `gender`: MALE | FEMALE (optional filter)
- `weightClass`: string (optional filter)
- `clubId`: uuid (optional filter)

**Response (200)**:
```json
{
  "players": [
    {
      "id": "uuid",
      "name": "string",
      "age": 16,
      "yearOfBirth": 2010,
      "weight": 45.5,
      "gender": "MALE",
      "clubId": "uuid",
      "clubName": "string",
      "photoUrl": "string"
    }
  ],
  "total": 42
}
```

---

## Matches

### POST /matches/generate

**Purpose**: Generate bracket for a weight class/gender

**Authorization**: HEAD_JUDGE only

**Request**:
```json
{
  "tournamentId": "uuid",
  "weightClass": "10-15kg",
  "gender": "MALE",
  "matchType": "SINGLE_ELIMINATION"
}
```

**Response (201)**:
```json
{
  "matches": [
    {
      "id": "uuid",
      "player1Id": "uuid",
      "player1Name": "string",
      "player2Id": "uuid",
      "player2Name": "string",
      "scheduledTime": "timestamp",
      "intraClubWarning": false,
      "bracketRound": 1
    }
  ],
  "totalMatches": 21,
  "warnings": [
    {"matchId": "uuid", "reason": "intra_club_match"}
  ]
}
```

**Errors**:
- 400: Insicient players for bracket
- 400: Players not in same weight class/gender
- 403: Not authorized

### POST /matches/:id/start

**Purpose**: Start a match (SCHEDULED → IN_PROGRESS)

**Authorization**: MAT_JUDGE only

**Response (200)**:
```json
{
  "id": "uuid",
  "status": "IN_PROGRESS",
  "startedAt": "timestamp",
  "currentRound": 1
}
```

**Errors**:
- 400: Invalid state transition
- 403: Not authorized

### POST /matches/:id/pause

**Purpose**: Pause a match (IN_PROGRESS → PAUSED)

**Authorization**: MAT_JUDGE only

**Response (200)**:
```json
{
  "id": "uuid",
  "status": "PAUSED",
  "pausedAt": "timestamp"
}
```

### POST /matches/:id/resume

**Purpose**: Resume a match (PAUSED → IN_PROGRESS)

**Authorization**: MAT_JUDGE only

**Response (200)**:
```json
{
  "id": "uuid",
  "status": "IN_PROGRESS",
  "resumedAt": "timestamp"
}
```

### POST /matches/:id/end

**Purpose**: End a match (IN_PROGRESS → FINISHED)

**Authorization**: MAT_JUDGE only

**Request**:
```json
{
  "winnerId": "uuid"
}
```

**Response (200)**:
```json
{
  "id": "uuid",
  "status": "FINISHED",
  "winnerId": "uuid",
  "endTime": "timestamp",
  "finalScore": {
    "player1": 45,
    "player2": 30
  }
}
```

**Errors**:
- 400: Winner not in match
- 400: Invalid state transition

### POST /matches/:id/cancel

**Purpose**: Cancel a match

**Authorization**: ADMIN (any state), HEAD_JUDGE (SCHEDULED only)

**Response (200)**:
```json
{
  "id": "uuid",
  "status": "CANCELLED",
  "cancelledAt": "timestamp"
}
```

**Errors**:
- 403: Not authorized for this cancellation
- 400: Invalid state transition

### GET /matches/:id

**Purpose**: Get match details with current state

**Authorization**: All authenticated users

**Response (200)**:
```json
{
  "id": "uuid",
  "tournamentId": "uuid",
  "type": "SINGLE_ELIMINATION",
  "player1": {
    "id": "uuid",
    "name": "string",
    "score": 45,
    "clubName": "string"
  },
  "player2": {
    "id": "uuid",
    "name": "string",
    "score": 30,
    "clubName": "string"
  },
  "status": "IN_PROGRESS",
  "currentRound": 2,
  "scheduledTime": "timestamp",
  "intraClubWarning": false,
  "events": [
    {
      "type": "ADD_POINT",
      "playerId": "uuid",
      "points": 3,
      "roundNumber": 1,
      "timestamp": "timestamp"
    }
  ]
}
```

---

## Clubs

### GET /clubs

**Purpose**: List all clubs

**Authorization**: All authenticated users

**Response (200)**:
```json
{
  "clubs": [
    {
      "id": "uuid",
      "name": "string",
      "playerCount": 12
    }
  ]
}
```

### POST /clubs

**Purpose**: Create a new club

**Authorization**: ADMIN only

**Request**:
```json
{
  "name": "string"
}
```

**Response (201)**:
```json
{
  "id": "uuid",
  "name": "string"
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Weight must be within tournament weight classes",
    "details": {
      "field": "weight",
      "value": 100,
      "allowed": [10, 15, 20]
    }
  }
}
```

**Error Codes**:
- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Not authorized for action
- `NOT_FOUND`: Resource not found
- `CONFLICT`: State conflict (e.g., invalid transition)
- `RATE_LIMITED`: Too many requests
