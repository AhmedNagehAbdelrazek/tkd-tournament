# 📄 SPEC-UPDATE-01: Bracket Progression, Tree Architecture & Socket Fallbacks

**Status:** Approved for Implementation  
**Context:** Addendum to the Master Specification, focusing on Single Elimination bracket generation, tree data structures, match conclusion rules, and WebSocket/REST parity.

---

## 1. Database Schema Additions (`Match` & `Player` Models)

To support the bracket tree and progression, the following fields must be added to the existing schema.

### 1.1 `Player` Model Additions
- `seed`: INTEGER, Nullable. *(Used for bracket generation. If null, the system shuffles randomly).*

### 1.2 `Match` Model Additions (Tree & Progression)
- `nextMatchId`: UUID, FK → `Match`, Nullable. *(Points to the match this winner feeds into. Null for the Final match).*
- `nextMatchSlot`: ENUM('PLAYER1', 'PLAYER2', null). *(Specifies which slot the winner fills in the `nextMatch`).*
- `stageName`: STRING. *(e.g., "Round of 16", "Quarterfinal 1", "Semifinal", "Final").*
- `bracketPosition`: INTEGER. *(Used for sorting matches to reconstruct the tree visually).*
- `endReason`: ENUM('TIME_EXPIRED', 'POINT_GAP', 'WALKOVER', 'INJURY_WITHDRAWAL', 'DISQUALIFICATION', 'REFEREE_STOPPAGE', 'GOLDEN_POINT', 'BYE', null). *(Mandatory when a match transitions to `FINISHED`).*

---

## 2. Bracket Generation & Bye Logic

Triggered via `POST /api/matches/generate`. The system must execute the following algorithm for a specific `weightClass` and `gender`:

### 2.1 Sizing & Byes Calculation
1. Count the number of registered players ($N$).
2. Calculate the Bracket Size ($S$) as the next power of 2 (e.g., if $N=10$, $S=16$).
3. Calculate the Number of Byes ($B = S - N$).

### 2.2 Seeding & Assignment
1. If `Tournament.settings.seedingEnabled` is true, sort players by `Player.seed` ascending.
2. If false, shuffle the player array randomly.
3. The top $B$ players in the sorted/shuffled list are assigned a **Bye**.

### 2.3 Tree Construction (Flat DB Records)
The system creates $S-1$ total `Match` records in the database.
- **Bye Matches:** Created with `status: FINISHED`, `endReason: BYE`, `player1Id: [Real Player]`, `player2Id: null`, `winnerId: [Real Player]`.
- **Standard Matches:** Created with `status: DRAFT`, `player1Id: null`, `player2Id: null`.
- **Linking:** The engine calculates `nextMatchId` and `nextMatchSlot` for every match to form a perfect binary tree.
- **Stage Naming:** Automatically assigned based on the total number of rounds (e.g., in a 16-player bracket: Round 1 = "Round of 16", Round 2 = "Quarterfinal", Round 3 = "Semifinal", Round 4 = "Final").

---

## 3. Match Conclusion & Automatic Progression

### 3.1 Mandatory End Reasons
When a match is ended (via Socket or REST), the payload **must** include an `endReason`. 
- If a player cannot fight, the judge must select `WALKOVER` or `INJURY_WITHDRAWAL`.
- The backend will automatically assign the `winnerId` to the opposing player.

### 3.2 Automatic Progression Engine
Whenever a `Match` transitions to `status: FINISHED`, the backend must execute the following:
1. Identify the `winnerId`.
2. Check if `nextMatchId` is not null.
3. If `nextMatchSlot == 'PLAYER1'`, update `nextMatch.player1Id = winnerId`.
4. If `nextMatchSlot == 'PLAYER2'`, update `nextMatch.player2Id = winnerId`.
5. Save the updated `nextMatch`.
6. Emit the `BRACKET:UPDATED` WebSocket event to the tournament room.

*(Note: Because Byes are generated as `FINISHED` matches, this exact same progression engine automatically places the player into Round 2 without manual intervention).*

---

## 4. Bracket Tree Service (Flat to Nested Transformation)

The database stores the bracket **flatly** for relational integrity and performance. The `BracketService` must transform this into a **nested JSON** structure for the frontend.

### 4.1 Transformation Logic
1. Fetch all `Match` records for the requested `tournamentId`, `weightClass`, and `gender`.
2. Group matches by `stageName`.
3. Build a hash map of matches by `id`.
4. Iterate through the matches. If a match has a `nextMatchId`, attach the current match object into the `nextMatch`'s `player1Source` or `player2Source` property.
5. Identify the root node (The `Final` match, where `nextMatchId` is null).
6. Determine the `currentStage` by finding the deepest stage that has at least one match with `status: IN_PROGRESS` or `SCHEDULED`.

### 4.2 Nested JSON Response Structure
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
      "player1Source": { "id": "qf1-uuid", "stageName": "Quarterfinal 1", "status": "FINISHED" },
      "player2Source": { "id": "qf2-uuid", "stageName": "Quarterfinal 2", "status": "FINISHED" }
    },
    "player2Source": { "..." : "..." }
  }
}
```

---

## 5. API & WebSocket Updates (Strict REST Fallback Rule)

**Rule:** Every WebSocket action **must** have a direct REST endpoint fallback. If a judge's tablet loses its WebSocket connection, it must be able to send actions via REST. The REST endpoint performs the exact same backend validation, updates the DB, and emits the WebSocket event to other connected clients.

### 5.1 New Endpoints
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/matches/finalize` | Locks `DRAFT` matches, applies Club Avoidance, sets to `SCHEDULED`. | Head Judge |
| `GET` | `/api/tournaments/:id/bracket` | Returns the **Nested JSON Tree** for a specific weight/gender. | All |

### 5.2 Socket ↔ REST Mapping Table
*The REST endpoints trigger the exact same service logic as the Socket events and broadcast the resulting state to the Socket room.*

| Action | WebSocket Event (Client ↔ Server) | REST Fallback Endpoint | Required Payload / Body |
| :--- | :--- | :--- | :--- |
| **Start Match** | `MATCH:START` | `POST /api/matches/:id/start` | `{ matchId }` |
| **Pause Match** | `MATCH:PAUSE` | `POST /api/matches/:id/pause` | `{ matchId }` |
| **Resume Match** | `MATCH:RESUME` | `POST /api/matches/:id/resume` | `{ matchId }` |
| **Add Point** | `MATCH:ADD_POINT` | `POST /api/matches/:id/points` | `{ matchId, playerId, points, roundNumber, action: 'ADD' }` |
| **Remove Point**| `MATCH:REMOVE_POINT`| `POST /api/matches/:id/points` | `{ matchId, playerId, points, roundNumber, action: 'REMOVE' }` |
| **End Round** | `MATCH:END_ROUND` | `POST /api/matches/:id/rounds/end` | `{ matchId }` |
| **End Match** | `MATCH:END` | `POST /api/matches/:id/end` | `{ matchId, winnerId, endReason }` *(endReason is mandatory)* |

### 5.3 Server-Only Broadcasts (No REST needed)
*These are emitted by the server to notify clients of state changes. Clients do not send these.*
- `MATCH:STATE_UPDATE`: Full match state (emitted immediately upon a client joining a match room).
- `MATCH:SCORE_UPDATE`: `{ matchId, player1Score, player2Score, roundNumber }`
- `MATCH:FINISHED_BY_POINT_GAP`: `{ matchId, winnerId, reason: 'POINT_GAP' }`
- `BRACKET:UPDATED`: `{ tournamentId, weightClass, gender }` *(Triggers frontend to refetch the nested bracket tree).*
- `MATCH:REST_VIOLATION_WARNING`: `{ matchId, playerId, requiredRestMin: 15 }`

---

## 6. Implementation Checklist for this Update

- [ ] Add `seed` to `Player` model.
- [ ] Add `nextMatchId`, `nextMatchSlot`, `stageName`, `bracketPosition`, `endReason` to `Match` model.
- [ ] Implement the Power-of-2 and Bye calculation algorithm in `MatchmakingService`.
- [ ] Implement the Flat-to-Nested tree transformation in `BracketService`.
- [ ] Implement the Automatic Progression hook (triggered on `Match.status = FINISHED`).
- [ ] Create the REST fallback endpoints for all 7 live match actions.
- [ ] Ensure Socket handlers and REST controllers call the exact same underlying service methods to maintain SSOT (Single Source of Truth).
- [ ] Enforce `endReason` validation in the `MATCH:END` / `POST /api/matches/:id/end` logic.