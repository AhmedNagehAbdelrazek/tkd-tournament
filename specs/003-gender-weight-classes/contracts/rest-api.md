# REST API Contracts: Gender-Specific Weight Classes

## Modified Endpoints

### POST /api/tournaments

**Purpose**: Create a tournament with gender-specific weight classes

**Request Body**:
```json
{
  "name": "Spring Championship 2026",
  "startDate": "2026-08-01",
  "endDate": "2026-08-03",
  "settings": {
    "weightClasses": {
      "MALE": [
        { "name": "Male -58kg", "min": 0, "max": 58 },
        { "name": "Male -68kg", "min": 58.01, "max": 68 }
      ],
      "FEMALE": [
        { "name": "Female -49kg", "min": 0, "max": 49 },
        { "name": "Female -57kg", "min": 49.01, "max": 57 }
      ]
    },
    "pointGapAutoEnd": 20
  }
}
```

**Success Response (201)**:
```json
{
  "data": {
    "id": 1,
    "name": "Spring Championship 2026",
    "startDate": "2026-08-01",
    "endDate": "2026-08-03",
    "settings": {
      "weightClasses": {
        "MALE": [
          { "name": "Male -58kg", "min": 0, "max": 58 },
          { "name": "Male -68kg", "min": 58.01, "max": 68 }
        ],
        "FEMALE": [
          { "name": "Female -49kg", "min": 0, "max": 49 },
          { "name": "Female -57kg", "min": 49.01, "max": 57 }
        ]
      },
      "pointGapAutoEnd": 20
    },
    "isCompleted": false,
    "excludedPlayers": []
  }
}
```

**Excluded Players Present (201)**:
```json
{
  "data": {
    "id": 1,
    "name": "Spring Championship 2026",
    "settings": { "...": "..." },
    "isCompleted": false,
    "excludedPlayers": [
      {
        "id": 5,
        "name": "Ahmed Ali",
        "gender": "MALE",
        "weight": 85,
        "clubName": "Cairo Tigers",
        "reason": "No MALE weight class matches 85kg — available ranges: Male -58kg, Male -68kg"
      }
    ]
  }
}
```

**Error Response (422)**:
```json
{
  "status": "error",
  "message": "Weight class validation failed",
  "code": "VALIDATION_ERROR"
}
```

---

### PUT /api/tournaments/:id/settings

**Purpose**: Update tournament weight class settings (only before matches start)

**Request Body**:
```json
{
  "weightClasses": {
    "MALE": [
      { "name": "Male -58kg", "min": 0, "max": 58 },
      { "name": "Male -74kg", "min": 58.01, "max": 74 }
    ],
    "FEMALE": [
      { "name": "Female -49kg", "min": 0, "max": 49 }
    ]
  }
}
```

**Success Response (200)**:
```json
{
  "data": {
    "id": 1,
    "name": "Spring Championship 2026",
    "settings": {
      "weightClasses": {
        "MALE": [
          { "name": "Male -58kg", "min": 0, "max": 58 },
          { "name": "Male -74kg", "min": 58.01, "max": 74 }
        ],
        "FEMALE": [
          { "name": "Female -49kg", "min": 0, "max": 49 }
        ]
      }
    },
    "isCompleted": false,
    "excludedPlayers": [
      {
        "id": 3,
        "name": "Sara Hassan",
        "gender": "FEMALE",
        "weight": 62,
        "clubName": "Alex Warriors",
        "reason": "No FEMALE weight class matches 62kg — available ranges: Female -49kg"
      }
    ]
  }
}
```

**Tournament Locked Error (409)**:
```json
{
  "status": "error",
  "message": "Cannot update weight classes while matches are in progress",
  "code": "CONFLICT"
}
```

**Tournament Not Found (404)**:
```json
{
  "status": "error",
  "message": "Tournament not found",
  "code": "NOT_FOUND"
}
```

---

## New Endpoints

### GET /api/tournaments/:id/excluded-players

**Purpose**: Retrieve all players who don't match any weight class for their gender

**Authentication**: Required (any authenticated user)

**Success Response (200)**:
```json
{
  "data": {
    "excludedPlayers": [
      {
        "id": 5,
        "name": "Ahmed Ali",
        "gender": "MALE",
        "weight": 85,
        "clubName": "Cairo Tigers",
        "reason": "No MALE weight class matches 85kg — available ranges: Male -58kg, Male -68kg"
      },
      {
        "id": 8,
        "name": "Sara Hassan",
        "gender": "FEMALE",
        "weight": 62,
        "clubName": "Alex Warriors",
        "reason": "No FEMALE weight class matches 62kg — available ranges: Female -49kg"
      }
    ],
    "total": 2
  }
}
```

**Empty Result (200)**:
```json
{
  "data": {
    "excludedPlayers": [],
    "total": 0
  }
}
```

**Tournament Not Found (404)**:
```json
{
  "status": "error",
  "message": "Tournament not found",
  "code": "NOT_FOUND"
}
```

---

## Unchanged Endpoints (Behavioral Change)

### POST /api/players

**Behavioral change**: Weight validation now checks against the player's gender-specific weight classes only.

**New Error Response (422)** — no matching weight class for gender:
```json
{
  "status": "error",
  "message": "Weight 75kg does not fall within any MALE weight class. Available ranges: Male -58kg, Male -68kg",
  "code": "VALIDATION_ERROR"
}
```

**Previous error** (flat array): `"Weight 75kg does not fall within any configured weight class"`

### POST /api/players/bulk

**Behavioral change**: Same as single player creation — per-player errors now reference gender-specific weight classes.

---

## Validation Rules

### Tournament Settings Validation

| Field | Rule | Error |
|-------|------|-------|
| `settings.weightClasses` | Must be an object (not array) | `weightClasses must be an object` |
| `settings.weightClasses.MALE` | Optional array of weight class objects | `MALE weight classes must be an array` |
| `settings.weightClasses.FEMALE` | Optional array of weight class objects | `FEMALE weight classes must be an array` |
| `settings.weightClasses.*.name` | Required string | `weight class name is required` |
| `settings.weightClasses.*.min` | Required number >= 0 | `weight class min must be a non-negative number` |
| `settings.weightClasses.*.max` | Required number > min | `weight class max must be greater than min` |
