# 🥋 Taekwondo Match Management System: Master Specification

**Version:** 2.0.0  
**Status:** Approved for Implementation  
**Tech Stack:** Node.js, PostgreSQL, Sequelize, Socket.io, Cloudinary, JWT  

---

## 1. System Overview & Core Business Rules

### 1.1 Purpose
A real-time backend system for managing Taekwondo tournaments. It handles player registration, algorithmic matchmaking (with club avoidance and rest periods), live match execution via WebSockets (with REST fallbacks), and automatic bracket progression for single-elimination tournaments. The backend is the **Single Source of Truth (SSOT)**.

### 1.2 User Roles (RBAC)
- **Admin**: Full system access, manage global settings, clubs, and users.
- **Head Judge**: Manage tournaments, generate/finalize brackets, override seeding/byes, finalize match results.
- **Mat Judge**: Control live match state, add/remove points, end rounds/matches.
- **Scorekeeper**: Read-only access for display boards.

### 1.3 Match & Tournament Rules
- **Match Types**: `SINGLE_ELIMINATION`, `ROUND_ROBIN`, `FRIENDLY`. (Focus is on standalone execution; no hybrid pool-to-knockout flows).
- **Weight & Gender**: Strict separation. Players only match within their configured weight class and gender.
- **Rest Period**: Minimum **15-minute gap** between a player's `endTime` of their last match and the `scheduledTime` of their next match.
- **Round Format**: Configurable (Default: 3 rounds, 2 mins/round, 1 min rest).
- **Point Gap Auto-End**: Configurable. If score difference reaches the threshold, backend auto-ends match.

### 1.4 Match End Reasons (Mandatory)
When a match concludes, the Mat Judge/Head Judge **must** provide an `endReason`. 
Allowed Enum Values: `TIME_EXPIRED`, `POINT_GAP`, `WALKOVER`, `INJURY_WITHDRAWAL`, `DISQUALIFICATION`, `REFEREE_STOPPAGE`, `GOLDEN_POINT`, `BYE`.

### 1.5 Bracket Progression & Club Avoidance
- **Club Avoidance**: 
  1. Never match same-club players. 
  2. Fallback: If mathematically impossible (e.g., last 2 players), allow but flag `intraClubWarning: true`. 
  3. Relaxation: If one club has >50% of the bracket, disable the rule for that bracket.
- **Progression**: Winners automatically advance to the `nextMatchId` in the designated `nextMatchSlot`.

---

## 2. Database Schema (Sequelize)

### 2.1 `User`
- `id`: UUID, PK
- `name`, `email` (Unique), `passwordHash`: STRING
- `role`: ENUM('ADMIN', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER')

### 2.2 `Club`
- `id`: UUID, PK
- `name`: STRING, Unique

### 2.3 `Tournament`
- `id`: UUID, PK
- `name`: STRING
- `startDate`, `endDate`: DATE
- `settings`: JSONB 
  - *Schema*: `{ "roundsCount": 3, "roundDurationSec": 120, "restBetweenRoundsSec": 60, "restBetweenMatchesMin": 15, "pointGapAutoEnd": 20, "weightClasses": [{"name": "10-15kg", "min": 10, "max": 15}], "seedingEnabled": true }`

### 2.4 `Player`
- `id`: UUID, PK *(The "Player ID" exit requirement)*
- `name`: STRING
- `dob`: DATE *(Full date; age/year calculated on read)*
- `weight`: DECIMAL(5,2)
- `gender`: ENUM('MALE', 'FEMALE')
- `clubId`: UUID, FK → `Club`
- `tournamentId`: UUID, FK → `Tournament`
- `photoUrl`: STRING *(Cloudinary URL)*
- `seed`: INTEGER, Nullable *(Tournament-specific ranking for bracket generation)*

### 2.5 `Match` (Flat Tree Structure)
*Every slot in the bracket, including byes, is represented as a Match record to maintain a perfectly uniform tree.*
- `id`: UUID, PK
- `tournamentId`: UUID, FK → `Tournament`
- `type`: ENUM('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'FRIENDLY')
- `weightClass`: STRING (e.g., "10-15kg")
- `gender`: ENUM('MALE', 'FEMALE')
- `player1Id`: UUID, FK → `Player`, Nullable
- `player2Id`: UUID, FK → `Player`, Nullable
- `scheduledTime`: TIMESTAMP, Nullable
- `endTime`: TIMESTAMP, Nullable
- `status`: ENUM('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED')
- `winnerId`: UUID, FK → `Player`, Nullable
- `endReason`: ENUM('TIME_EXPIRED', 'POINT_GAP', 'WALKOVER', 'INJURY_WITHDRAWAL', 'DISQUALIFICATION', 'REFEREE_STOPPAGE', 'GOLDEN_POINT', 'BYE', null)
- `currentRound`: INTEGER, Default: 1
- `player1Score`: INTEGER, Default: 0
- `player2Score`: INTEGER, Default: 0
- `intraClubWarning`: BOOLEAN, Default: false
- **Bracket Linking Fields:**
  - `nextMatchId`: UUID, FK → `Match`, Nullable *(Points to the next match in the tree)*
  - `nextMatchSlot`: ENUM('PLAYER1', 'PLAYER2', null) *(Which slot the winner fills in the next match)*
  - `stageName`: STRING *(e.g., "Round of 16", "Quarterfinal", "Semifinal", "Final")*
  - `bracketPosition`: INTEGER *(Used for sorting and tree reconstruction)*

### 2.6 `MatchEvent` (Audit Trail)
- `id`: UUID, PK
- `matchId`: UUID, FK → `Match`
- `type`: ENUM('START', 'PAUSE', 'RESUME', 'END_ROUND', 'ADD_POINT', 'REMOVE_POINT', 'AUTO_END_BY_GAP', 'MANUAL_END')
- `playerId`: UUID, FK → `Player`, Nullable
- `points`: INTEGER, Nullable
- `roundNumber`: INTEGER
- `timestamp`: TIMESTAMP

---

## 3. Matchmaking & Bracket Progression Engine

### 3.1 Bracket Generation Algorithm (Single Elimination)
Triggered via `POST /api/matches/generate`.
1. **Filter**: Get all players for the specific `weightClass` and `gender`.
2. **Calculate Bracket Size**: Find the next power of 2 (e.g., 10 players → 16-player bracket).
3. **Calculate Byes**: `Bracket Size - Number of Players = Number of Byes`.
4. **Seeding/Sorting**: 
   - If `settings.seedingEnabled` is true, sort players by `Player.seed` ascending.
   - If false, shuffle players randomly.
5. **Assign Byes**: The top `N` seeded players receive a "Bye". 
   - *Implementation*: Create a `Match` record for the bye where `player1Id` = Real Player, `player2Id` = null, `status` = `FINISHED`, `endReason` = `BYE`, `winnerId` = Real Player.
6. **Generate Matches**: Create the remaining matches for Round 1.
7. **Link Tree**: Assign `nextMatchId` and `nextMatchSlot` to link Round 1 matches to Round 2, Round 2 to Quarterfinals, etc.
8. **Stage Naming**: Automatically assign `stageName` based on the total number of rounds (e.g., if 4 rounds total, Round 1 is "Round of 16", Round 2 is "Quarterfinal").
9. **Status**: All generated matches start as `DRAFT`.

### 3.2 Head Judge Override & Finalization
- Matches remain in `DRAFT` status until finalized.
- Head Judge can update `Player.seed` or manually swap players in `DRAFT` matches.
- `POST /api/matches/finalize`: Transitions all `DRAFT` matches to `SCHEDULED`, locks the bracket, and applies the **Club Avoidance Fallback** logic. If intra-club matches are forced, `intraClubWarning` is set to `true`.

### 3.3 Automatic Progression
When a match transitions to `FINISHED`:
1. The backend identifies the `winnerId`.
2. If `nextMatchId` exists, the backend updates the next match:
   - If `nextMatchSlot` == 'PLAYER1', set `nextMatch.player1Id` = `winnerId`.
   - If `nextMatchSlot` == 'PLAYER2', set `nextMatch.player2Id` = `winnerId`.
3. The backend broadcasts `BRACKET:UPDATED` via WebSocket.

---

## 4. API & WebSocket Contracts (Unified with REST Fallbacks)

*Rule: Every WebSocket action has a direct REST fallback for clients that cannot maintain a socket connection. The REST endpoint performs the exact same backend logic and broadcasts the WebSocket event to other connected clients.*

### 4.1 Tournament & Player Management
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate, return JWT. | Public |
| `POST` | `/api/tournaments` | Create tournament with settings. | Admin |
| `GET` | `/api/tournaments/:id` | Get tournament details. | All |
| `POST` | `/api/players` | Create player. | Admin, Head Judge |
| `GET` | `/api/players` | List players (includes calculated `age`, `yearOfBirth`). | All |

### 4.2 Matchmaking & Bracket Tree
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/matches/generate` | Generate draft bracket (calculates byes, links tree). | Head Judge |
| `POST` | `/api/matches/finalize` | Lock bracket, apply club avoidance, set to SCHEDULED. | Head Judge |
| `GET` | `/api/tournaments/:id/bracket` | **Returns Nested JSON Tree** for a specific weight/gender. Includes current stage. | All |

### 4.3 Live Match Execution & Scoring (Socket + REST Fallback)

| Action | WebSocket Event (Client ↔ Server) | REST Fallback Endpoint | Payload / Body |
| :--- | :--- | :--- | :--- |
| **Start Match** | `MATCH:START` | `POST /api/matches/:id/start` | `{ matchId }` |
| **Pause Match** | `MATCH:PAUSE` | `POST /api/matches/:id/pause` | `{ matchId }` |
| **Resume Match** | `MATCH:RESUME` | `POST /api/matches/:id/resume` | `{ matchId }` |
| **Add Point** | `MATCH:ADD_POINT` | `POST /api/matches/:id/points` | `{ matchId, playerId, points, roundNumber, action: 'ADD' }` |
| **Remove Point**| `MATCH:REMOVE_POINT`| `POST /api/matches/:id/points` | `{ matchId, playerId, points, roundNumber, action: 'REMOVE' }` |
| **End Round** | `MATCH:END_ROUND` | `POST /api/matches/:id/rounds/end` | `{ matchId }` |
| **End Match** | `MATCH:END` | `POST /api/matches/:id/end` | `{ matchId, winnerId, endReason }` *(endReason is mandatory)* |

### 4.4 Server Broadcasts (WebSocket Only)
*These are emitted by the server to all clients in the `match_<id>` or `tournament_<id>` room. No REST fallback needed as they are notifications.*
- `MATCH:STATE_UPDATE`: Full match state (emitted on connection/reconnection).
- `MATCH:SCORE_UPDATE`: `{ matchId, player1Score, player2Score, roundNumber }`
- `MATCH:FINISHED_BY_POINT_GAP`: `{ matchId, winnerId, reason: 'POINT_GAP' }`
- `BRACKET:UPDATED`: `{ tournamentId, weightClass, gender }` (Triggers frontend to refetch the bracket tree).
- `MATCH:REST_VIOLATION_WARNING`: `{ matchId, playerId, requiredRestMin: 15 }`

---

## 5. Bracket Tree Service (Flat to Nested Transformation)

The database stores the bracket flatly for performance and relational integrity. The `BracketService` transforms this into a nested structure for the frontend.

### 5.1 Transformation Logic
1. Fetch all `Match` records for the requested `tournamentId`, `weightClass`, and `gender`.
2. Sort matches by `bracketPosition` or `stageName`.
3. Build a hash map of matches by `id`.
4. Iterate through matches. If a match has a `nextMatchId`, attach the current match object as a child to the `nextMatch`'s `player1Matches` or `player2Matches` array.
5. Identify the root node (The `Final` match, which has `nextMatchId = null`).

### 5.2 Nested JSON Response Structure
```json
{
  "tournamentId": "uuid",
  "weightClass": "10-15kg",
  "gender": "MALE",
  "currentStage": "Quarterfinal",
  "bracket": {
    "id": "final-match-uuid",
    "stageName": "Final",
    "status": "SCHEDULED",
    "player1": { "id": "uuid", "name": "Player A" },
    "player2": { "id": "uuid", "name": "Player B" },
    "player1Source": {
      "id": "semi1-uuid",
      "stageName": "Semifinal 1",
      "status": "FINISHED",
      "winnerId": "uuid",
      "player1Source": { "id": "qf1-uuid", "stageName": "Quarterfinal 1", "status": "FINISHED", "winnerId": "uuid" },
      "player2Source": { "id": "qf2-uuid", "stageName": "Quarterfinal 2", "status": "FINISHED", "winnerId": "uuid" }
    },
    "player2Source": { ... }
  }
}
```

---

## 6. Implementation Guidelines & Edge Cases

1. **State Synchronization**: When a client connects to Socket.io room `match_<id>`, the server *must* immediately emit `MATCH:STATE_UPDATE` with the current DB state. Do not rely on client-side state.
2. **Walkovers & Injuries**: If a player cannot fight, the Mat Judge uses the REST/WebSocket `MATCH:END` endpoint with `endReason: 'WALKOVER'` or `'INJURY_WITHDRAWAL'`. The backend automatically sets the `winnerId` to the opposing player and triggers the **Automatic Progression** logic to feed them into the `nextMatchId`.
3. **Bye Progression**: Because "Byes" are created as `FINISHED` matches with `endReason: 'BYE'` during the generation phase, the **Automatic Progression** logic handles them identically to normal matches. The player automatically appears in the Round 2 slot without manual intervention.
4. **Validation**: The backend must reject any `MATCH:ADD_POINT` or `MATCH:END` requests if the match status is not `IN_PROGRESS` (for scoring) or `IN_PROGRESS`/`PAUSED` (for ending).
5. **Rest Period Enforcement**: The `POST /api/matches/generate` and manual scheduling endpoints must query the `Match` table to ensure no player is scheduled within 15 minutes of their previous `endTime`. If violated, return a `400 Bad Request` with the `MATCH:REST_VIOLATION_WARNING` payload.