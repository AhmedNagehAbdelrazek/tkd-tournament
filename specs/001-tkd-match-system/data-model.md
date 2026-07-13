# Data Model: Taekwondo Match Management System

**Date**: 2026-07-13

## Entity Relationship Diagram

```text
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Club     │       │  Tournament │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (UUID)   │       │ id (UUID)   │       │ id (UUID)   │
│ name        │       │ name        │       │ name        │
│ email       │       └──────┬──────┘       │ startDate   │
│ passwordHash│              │              │ endDate     │
│ role        │              │              │ settings    │
└─────────────┘              │              └──────┬──────┘
                             │                     │
                             │    ┌────────────────┘
                             │    │
                       ┌─────┴────┴─────┐
                       │     Player     │
                       ├────────────────┤
                       │ id (UUID)      │
                       │ name           │
                       │ dob            │
                       │ weight         │
                       │ gender         │
                       │ clubId (FK)    │
                       │ tournamentId   │
                       │ photoUrl       │
                       └───────┬────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Match (as P1) │   │  Match (as P2) │   │   MatchEvent    │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ id (UUID)       │   │ id (UUID)       │   │ id (UUID)       │
│ tournamentId    │   │ tournamentId    │   │ matchId (FK)    │
│ type            │   │ type            │   │ type            │
│ player1Id (FK)  │   │ player1Id       │   │ playerId (FK)   │
│ player2Id (FK)  │   │ player2Id (FK)  │   │ points          │
│ scheduledTime   │   │ scheduledTime   │   │ roundNumber     │
│ endTime         │   │ endTime         │   │ timestamp       │
│ status          │   │ status          │   └─────────────────┘
│ winnerId        │   │ winnerId        │
│ currentRound    │   │ currentRound    │
│ intraClubWarning│   │ intraClubWarning│
└─────────────────┘   └─────────────────┘
```

## Entity Definitions

### 1. User

**Purpose**: System users with role-based access

| Field        | Type    | Constraints                      | Description                    |
| ------------ | ------- | -------------------------------- | ------------------------------ |
| id           | UUID    | PK, DEFAULT uuid_generate_v4()  | Unique identifier              |
| name         | STRING  | NOT NULL                         | User's full name               |
| email        | STRING  | NOT NULL, UNIQUE                 | Login email                    |
| passwordHash | STRING  | NOT NULL                         | Bcrypt hashed password         |
| role         | ENUM    | NOT NULL, IN (ADMIN, HEAD_JUDGE, MAT_JUDGE, SCOREKEEPER) | User role |

**Indexes**: email (unique)

### 2. Club

**Purpose**: Organization to which players belong

| Field | Type   | Constraints                     | Description       |
| ----- | ------ | ------------------------------- | ----------------- |
| id    | UUID   | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| name  | STRING | NOT NULL, UNIQUE                | Club name         |

**Indexes**: name (unique)

### 3. Tournament

**Purpose**: Competition event with configurable settings

| Field     | Type    | Constraints                     | Description                    |
| --------- | ------- | ------------------------------- | ------------------------------ |
| id        | UUID    | PK, DEFAULT uuid_generate_v4() | Unique identifier              |
| name      | STRING  | NOT NULL                        | Tournament name                |
| startDate | DATE    | NOT NULL                        | Competition start date         |
| endDate   | DATE    | NOT NULL                        | Competition end date           |
| settings  | JSONB   | NOT NULL, DEFAULT '{}'          | Configurable tournament rules  |

**Settings Schema**:
```json
{
  "roundDurationSec": 120,
  "restBetweenRoundsSec": 60,
  "restBetweenMatchesMin": 15,
  "pointGapAutoEnd": 20,
  "weightClasses": [
    {"name": "10-15kg", "min": 10, "max": 15},
    {"name": "15-20kg", "min": 15, "max": 20}
  ]
}
```

**Indexes**: None (small dataset)

### 4. Player

**Purpose**: Competitor registered in a tournament

| Field        | Type      | Constraints                     | Description                    |
| ------------ | --------- | ------------------------------- | ------------------------------ |
| id           | UUID      | PK, DEFAULT uuid_generate_v4() | Unique identifier              |
| name         | STRING    | NOT NULL                        | Player's full name             |
| dob          | DATE      | NOT NULL                        | Full date of birth             |
| weight       | DECIMAL   | NOT NULL, CHECK (weight > 0)    | Weight in kg                   |
| gender       | ENUM      | NOT NULL, IN (MALE, FEMALE)     | Player gender                  |
| clubId       | UUID      | FK → Club.id, NOT NULL          | Associated club                |
| tournamentId | UUID      | FK → Tournament.id, NOT NULL    | Registered tournament          |
| photoUrl     | STRING    | NULL                            | Cloudinary URL                 |

**Indexes**: tournamentId, clubId, (tournamentId, gender, weight)

**Computed Fields**:
- `age`: Calculated from dob (current date - dob)
- `yearOfBirth`: Extracted from dob

### 5. Match

**Purpose**: Scheduled or completed competition between two players

| Field            | Type      | Constraints                     | Description                    |
| ---------------- | --------- | ------------------------------- | ------------------------------ |
| id               | UUID      | PK, DEFAULT uuid_generate_v4() | Unique identifier              |
| tournamentId     | UUID      | FK → Tournament.id, NOT NULL    | Parent tournament              |
| type             | ENUM      | NOT NULL, IN (SINGLE_ELIMINATION, ROUND_ROBIN, FRIENDLY) | Match format |
| player1Id        | UUID      | FK → Player.id, NOT NULL        | First competitor               |
| player2Id        | UUID      | FK → Player.id, NOT NULL        | Second competitor              |
| scheduledTime    | TIMESTAMP | NOT NULL                        | Planned match start            |
| endTime          | TIMESTAMP | NULL                            | Actual match end               |
| status           | ENUM      | NOT NULL, DEFAULT 'SCHEDULED'   | Current state                  |
| winnerId         | UUID      | FK → Player.id, NULL            | Match winner (if finished)     |
| currentRound     | INTEGER   | NOT NULL, DEFAULT 1             | Current round number           |
| intraClubWarning | BOOLEAN   | NOT NULL, DEFAULT false         | Same-club match flag           |

**Status Enum**: SCHEDULED, IN_PROGRESS, PAUSED, FINISHED, CANCELLED

**Indexes**: tournamentId, status, (player1Id, scheduledTime), (player2Id, scheduledTime)

**State Transitions**:
```text
SCHEDULED ──────→ IN_PROGRESS ──────→ FINISHED
    │                   │
    │                   ↓
    │               PAUSED
    │                   │
    │                   ↓
    └─────────────→ CANCELLED
```

### 6. MatchEvent

**Purpose**: Audit trail for all match state changes and scoring

| Field       | Type      | Constraints                     | Description                    |
| ----------- | --------- | ------------------------------- | ------------------------------ |
| id          | UUID      | PK, DEFAULT uuid_generate_v4() | Unique identifier              |
| matchId     | UUID      | FK → Match.id, NOT NULL         | Parent match                   |
| type        | ENUM      | NOT NULL                        | Event type                     |
| playerId    | UUID      | FK → Player.id, NULL            | Affected player (if scoring)   |
| points      | INTEGER   | NULL                            | Points added/removed           |
| roundNumber | INTEGER   | NOT NULL                        | Round when event occurred      |
| timestamp   | TIMESTAMP | NOT NULL, DEFAULT NOW()         | Event time                     |

**Type Enum**: START, PAUSE, RESUME, END_ROUND, ADD_POINT, REMOVE_POINT, AUTO_END_BY_GAP, CANCEL

**Indexes**: matchId, (matchId, timestamp)

## Relationships

| Relationship     | Type        | Description                        |
| ---------------- | ----------- | ---------------------------------- |
| User → Club      | None        | Users manage clubs, no FK          |
| Club → Player    | One-to-Many | A club has many players            |
| Tournament → Player | One-to-Many | A tournament has many players   |
| Tournament → Match | One-to-Many | A tournament has many matches    |
| Match → Player1  | Many-to-One | Match has one first player         |
| Match → Player2  | Many-to-One | Match has one second player        |
| Match → Winner   | Many-to-One | Match has optional winner          |
| Match → MatchEvent | One-to-Many | A match has many events           |

## Validation Rules

### Player Registration
- Weight must fall within one of the tournament's weight classes
- Gender must match tournament bracket (MALE or FEMALE)
- Date of birth must be valid date (not future)
- Club must exist and be associated with the tournament

### Match Creation
- Player1 and Player2 must be different players
- Both players must be in the same tournament
- Both players must be in the same weight class and gender
- Scheduled time must respect 15-minute rest period for both players
- Intra-club match must have intraClubWarning = true

### Scoring
- Points must be positive integer
- Player must be in the match being scored
- Match must be in IN_PROGRESS state
- Round must be valid (1-3 or configured max)

### State Transitions
- SCHEDULED → IN_PROGRESS (start match)
- IN_PROGRESS → PAUSED (pause match)
- PAUSED → IN_PROGRESS (resume match)
- IN_PROGRESS → FINISHED (end match)
- SCHEDULED → CANCELLED (cancel before start)
- CANCELLED cannot transition to any state

## Indexes Summary

```sql
-- Performance indexes
CREATE INDEX idx_players_tournament ON players(tournamentId);
CREATE INDEX idx_players_club ON players(clubId);
CREATE INDEX idx_players_bracket ON players(tournamentId, gender, weight);
CREATE INDEX idx_matches_tournament ON matches(tournamentId);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_player1 ON matches(player1Id, scheduledTime);
CREATE INDEX idx_matches_player2 ON matches(player2Id, scheduledTime);
CREATE INDEX idx_events_match ON matchevents(matchId);
CREATE INDEX idx_events_match_time ON matchevents(matchId, timestamp);
```
