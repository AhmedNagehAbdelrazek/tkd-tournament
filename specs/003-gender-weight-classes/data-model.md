# Data Model: Gender-Specific Weight Classes

## Changes Summary

No new database models. No schema migrations. All changes are to the in-memory structure of the existing `Tournament.settings` JSONB field and the business logic that reads/writes it.

## Tournament Settings (Updated Structure)

### Current Structure

```json
{
  "weightClasses": [
    { "name": "10-15kg", "min": 10, "max": 15 },
    { "name": "15-20kg", "min": 15, "max": 20 }
  ],
  "pointGapAutoEnd": 20,
  "restBetweenMatchesMin": 5,
  "roundDurationSec": 120,
  "restBetweenRoundsSec": 30
}
```

### Updated Structure

```json
{
  "weightClasses": {
    "MALE": [
      { "name": "Male -58kg", "min": 0, "max": 58 },
      { "name": "Male -68kg", "min": 58.01, "max": 68 },
      { "name": "Male -80kg", "min": 68.01, "max": 80 }
    ],
    "FEMALE": [
      { "name": "Female -49kg", "min": 0, "max": 49 },
      { "name": "Female -57kg", "min": 49.01, "max": 57 },
      { "name": "Female -67kg", "min": 57.01, "max": 67 }
    ]
  },
  "pointGapAutoEnd": 20,
  "restBetweenMatchesMin": 5,
  "roundDurationSec": 120,
  "restBetweenRoundsSec": 30
}
```

### Validation Rules

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `weightClasses` | Object | Yes | Must be an object with `MALE` and/or `FEMALE` keys |
| `weightClasses.MALE` | Array | No | Each entry: `{name: string, min: number, max: number}` |
| `weightClasses.FEMALE` | Array | No | Each entry: `{name: string, min: number, max: number}` |
| `weightClasses.*.name` | String | Yes | Non-empty, unique within same gender |
| `weightClasses.*.min` | Number | Yes | >= 0, must be < max |
| `weightClasses.*.max` | Number | Yes | > min |

**Empty arrays are valid** — an empty array for a gender means no players of that gender can register.

## Excluded Player (Computed Entity)

This is not a database entity. It is computed at runtime by evaluating registered players against gender-specific weight classes.

### Fields

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | Integer | Player.id | Player identifier |
| `name` | String | Player.name | Player name |
| `gender` | Enum | Player.gender | MALE or FEMALE |
| `weight` | Decimal | Player.weight | Player's registered weight in kg |
| `clubName` | String | Club.name (via association) | Player's club name |
| `reason` | String | Computed | Explanation of why the player is excluded |

### Reason Message Format

```
No {GENDER} weight class matches {WEIGHT}kg — available ranges: {RANGE_LIST}
```

Where `RANGE_LIST` is a comma-separated list of weight class names for the player's gender. If no weight classes exist for the gender: `No weight classes configured for {GENDER} division`.

## Existing Models (Unchanged)

### Player

No schema changes. Fields used by this feature:
- `gender`: `ENUM('MALE', 'FEMALE')` — already exists
- `weight`: `DECIMAL(5,2)` — already exists
- `tournamentId`: `INTEGER` FK — already exists

### Tournament

No schema changes. The `settings` JSONB field is updated in place:
- `settings.weightClasses` changes from flat array to gender-keyed object

### Match

No schema changes. The `weightClass` string field on Match continues to store the weight class name. The `generateBracket` service must now resolve the weight class from the gender-keyed structure.

## Relationships (Unchanged)

```
Tournament 1-->* Player (tournament_id)
Tournament 1-->* Match (tournament_id)
Club 1-->* Player (club_id)
```
