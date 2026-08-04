# 🥋 Meedan Tournament Management System - Backend API Documentation

**Base URL:** `/api/v1`
**Authentication:** All endpoints (except `/auth/*`) require the header:
`Authorization: Bearer <token>`

## 📦 Common Data Structures

### Pagination
**Query Parameters (Request):**
```typescript
page: number;      // 1-indexed
pageSize: number;  // e.g., 10, 20, 50
```
**Paginated Response:**
```json
{
  "data": "T[]",
  "totalCount": "number",
  "page": "number",
  "pageSize": "number"
}
```

---

## 🔐 1. Authentication

### `POST /auth/register`
Creates a new user account.
- **Body:**
  ```json
  {
    "fullName": "string",
    "email": "string",
    "password": "string",
    "role": "coach" // Frontend defaults to 'coach'
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "user": { "id": "string", "fullName": "string", "email": "string", "role": "string" },
    "token": "string (JWT)"
  }
  ```

### `POST /auth/login`
Authenticates a user.
- **Body:**
  ```json
  { "email": "string", "password": "string" }
  ```
- **Response (200 OK):** Same as register response.

---

## 🏆 2. Tournaments

### `GET /tournaments`
Fetches a paginated list of tournaments.
- **Query Params:** `page`, `pageSize`, `status?` (`upcoming` | `ongoing` | `completed`), `search?`
- **Response:** `PaginatedResponse<Tournament>`

### `POST /tournaments`
Creates a new tournament and auto-generates brackets for all categories.
- **Body:**
  ```json
  {
    "name": "string",
    "startDate": "ISO8601 string",
    "endDate": "ISO8601 string",
    "clubs": ["string (club IDs)"],
    "categories": {
      "gender": "Male" | "Female" | "Both",
      "bracketDepth": "number",
      "weights": {
        "males": [{ "name": "string", "minWeight": "number", "maxWeight": "number" }],
        "females": [{ "name": "string", "minWeight": "number", "maxWeight": "number" }]
      }
    }
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "string",
    "name": "string",
    "status": "upcoming",
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "categories": ["cat_id_1", "cat_id_2"],
    "bracketDepth": 3,
    "registeredPlayers": 0,
    "matchesPlayed": 0,
    "brackets": {
      "categories": {
        "1": {
          "categoryName": "Male -58kg - male",
          "gender": "MALE",
          "matches": [],
          "totalMatches": 0,
          "warnings": []
        }
      },
      "totalMatches": 0,
      "totalWarnings": 0,
      "warnings": []
    }
  }
  ```

### `GET /tournaments/:id`
Fetches a single tournament summary.
- **Response:**
  ```json
  {
    "id": "string",
    "name": "string",
    "status": "upcoming" | "ongoing" | "completed",
    "startDate": "ISO8601",
    "endDate": "ISO8601",
    "categories": ["string (Category IDs)"], // Array of IDs
    "bracketDepth": "number",
    "registeredPlayers": "number",
    "matchesPlayed": "number"
  }
  ```

### `PUT /tournaments/:id`
Updates a tournament.
- **Body:** `Partial<CreateTournamentPayload>`
- **⚠️ Business Logic:** If `startDate`, `endDate`, or `categories` are modified, the backend **must** regenerate the entire bracket and reshuffle player matchups. If only `name` is modified, no regeneration is needed.
- **Response (200):** Updated `Tournament` object.

### `DELETE /tournaments/:id`
- **Response (204):** No Content.

---

## 🥇 3. Categories & Brackets

### `GET /categories/:categoryId`
Fetches a specific category and its full bracket tree (matches).
- **Response:**
  ```json
  {
    "id": "string",
    "name": "string",
    "bracketDepth": "number",
    "matches": [
      {
        "id": "string",
        "round": "number",
        "player1": "Player | null",
        "player2": "Player | null",
        "winner": "Player | null",
        "nextMatchId": "string | null"
      }
    ]
  }
  ```
  *Note: `round` uses a countdown system: 1 = Final, 2 = Semi-Final, 3 = Quarter-Final, 4 = Round of 16, etc.*

---

## 🥋 4. Players

### `GET /players`
Fetches registered players.
- **Query Params:** `page`, `pageSize`, `search?` (searches name, club, nationalId), `gender?`, `clubName?`, `sortBy?`, `sortOrder?` (`asc` | `desc`).
- **Response:** `PaginatedResponse<Player>`

### `POST /players`
Registers one or multiple players. (Supports `multipart/form-data` if images/files are uploaded, otherwise JSON).
- **Body (JSON):**
  ```json
  [
    {
      "fullName": "string",
      "nationalId": "string (14 digits)",
      "gender": "Male" | "Female",
      "weightKg": "number",
      "club": { "id": "string", "name": "string" },
      "dateOfBirth": "ISO8601",
      "imageUrl": "string (optional)",
      "birthCertificateUrl": "string (optional)"
    }
  ]
  ```
- **Response (201):** Array of created `Player` objects.

---

## 🏢 5. Clubs

### `GET /clubs`
- **Query Params:** `page`, `pageSize`, `search?`
- **Response:** `PaginatedResponse<Club>` (`Club`: `{ id: string, name: string }`)

### `POST /clubs`
- **Body:** `{ "name": "string" }`
- **Response (201):** `Club` object.

---

## ⚔️ 6. Matches (General List)

### `GET /matches`
Fetches a global list of matches across all tournaments (for the director's dashboard).
- **Query Params:** `page`, `pageSize`, `tournamentId?`, `playerSearch?`, `startDate?`, `endDate?`, `status?` (`PENDING` | `IN_PROGRESS` | `COMPLETED`), `round?`.
- **Response:** `PaginatedResponse<MatchListItem>`
  ```json
  {
    "id": "string",
    "tournamentId": "string",
    "tournamentName": "string",
    "categoryName": "string",
    "round": "number",
    "player1": "Player | null",
    "player2": "Player | null",
    "winner": "Player | null",
    "status": "PENDING" | "IN_PROGRESS" | "COMPLETED",
    "scheduledAt": "ISO8601"
  }
  ```

---

## 🏆 6.1 Bracket Generation

### `POST /matches/generate`
Generates a single-elimination bracket for one weight class. Trims players to nearest power of 2 (floor) — no BYEs.
- **Auth:** `HEAD_JUDGE`
- **Body:**
  ```json
  {
    "tournamentId": "number",
    "gender": "MALE" | "FEMALE",
    "weightClass": "string",
    "matchType": "SINGLE_ELIMINATION"
  }
  ```
- **Response (201):**
  ```json
  {
    "matches": [
      {
        "id": "number",
        "bracketRound": 1,
        "stageName": "FINAL",
        "bracketPosition": 0,
        "nextMatchId": null,
        "nextMatchSlot": null,
        "player1Id": null,
        "player2Id": null,
        "status": "SCHEDULED",
        "categoryId": "number",
        "weightClass": "string"
      }
    ],
    "totalMatches": 7,
    "warnings": [
      { "playerId": 10, "playerName": "Player X", "reason": "excluded_bracket_trim" }
    ]
  }
  ```

### `POST /matches/tournament/:id/generate-brackets`
Generates brackets for ALL categories in a tournament at once.
- **Auth:** `Admin`
- **Response (201):**
  ```json
  {
    "categories": {
      "1": {
        "categoryName": "Male -58kg - male",
        "gender": "MALE",
        "matches": [...],
        "totalMatches": 7,
        "warnings": []
      }
    },
    "totalMatches": 14,
    "totalWarnings": 0,
    "warnings": []
  }
  ```

**Bracket Convention:**
- Round numbering reversed: `1` = Final, `2` = Semi-Final, `3` = Quarter-Final, etc.
- Each match has `nextMatchId` pointing to the next round match (null on Final).
- `nextMatchSlot` (`PLAYER1` | `PLAYER2`) indicates which slot the winner fills.
- Player count trimmed to `floor(log2(N))` — clean bracket, no BYEs, no byes.

---

## ⏱️ 7. Live Matches (Scoring & State)

### `GET /matches/:matchId/live`
Fetches the real-time state of a match for the judge/spectator screens.
- **Response (`LiveMatchResponse`):**
  ```json
  {
    "id": "string",
    "player1": "Player",
    "player2": "Player",
    "winner": "Player | null",
    "nextMatchId": "string | null",
    "round": "number",
    "currentRound": "number",
    "totalRounds": "number",
    "roundDurationSeconds": "number",
    "hongScore": "number",
    "chungScore": "number",
    "hongPenalties": "number",
    "chungPenalties": "number",
    "hongInjured": "boolean",
    "chungInjured": "boolean",
    "hongExcluded": "boolean",
    "chungExcluded": "boolean",
    "timerStartTime": "number | null (Unix timestamp in ms)",
    "accumulatedPausedTime": "number (ms)",
    "status": "PRE_MATCH" | "IN_PROGRESS" | "PAUSED" | "ROUND_END" | "MATCH_END"
  }
  ```

### `POST /matches/:matchId/live/action`
Handles state transitions.
- **Body:** `{ "action": "START" | "PAUSE" | "RESUME" | "END_ROUND" | "START_NEXT_ROUND" | "END_MATCH" | "RESET" }`
- **⚠️ Business Logic:** 
  - On `END_MATCH`: Backend must evaluate `hongScore` vs `chungScore` and auto-assign the `winner`.
  - On `START` / `RESUME`: Set `timerStartTime` to current Unix timestamp.
  - On `PAUSE`: Calculate elapsed time, add to `accumulatedPausedTime`, set `timerStartTime` to null.
- **Response:** Updated `LiveMatchResponse`.

### `POST /matches/:matchId/live/points`
Adds points to a player.
- **Body:** `{ "side": "hong" | "chung", "points": 1 | 2 | 3 }`
- **⚠️ Business Logic:** Backend should check if a score threshold (e.g., 20 points or point gap) is met to auto-win the round/match.
- **Response:** Updated `LiveMatchResponse`.

### `POST /matches/:matchId/live/points/undo`
Removes points (judge error correction).
- **Body:** `{ "side": "hong" | "chung", "points": 1 | 2 | 3 }`
- **Response:** Updated `LiveMatchResponse`.

### `POST /matches/:matchId/live/penalty`
Adds a Gam-jeom (penalty).
- **Body:** `{ "side": "hong" | "chung" }`
- **⚠️ Business Logic:** Backend **must** increment the target's penalty count AND automatically add `+1` point to the **opponent's** score.
- **Response:** Updated `LiveMatchResponse`.

### `POST /matches/:matchId/live/injury`
Marks or unmarks a player as injured.
- **Body:** `{ "side": "hong" | "chung", "isInjured": "boolean" }`
- **Response:** Updated `LiveMatchResponse`.

### `POST /matches/:matchId/live/exclude`
Disqualifies a player.
- **Body:** `{ "side": "hong" | "chung", "reason": "string (optional)" }`
- **⚠️ Business Logic:** Backend must set the target's `excluded` flag to `true`, set the **opponent** as the `winner`, and change match `status` to `MATCH_END`.
- **Response:** Updated `LiveMatchResponse`.

### `GET /matches/:matchId/suggestions`
Fetches up to 5 suggested next matches for the judge to start.
- **Response:** Array of `SuggestedMatch`:
  ```json
  [
    {
      "id": "string",
      "categoryName": "string",
      "tournamentName": "string",
      "player1": "Player",
      "player2": "Player",
      "scheduledAt": "ISO8601",
      "priority": "number (1 = highest)"
    }
  ]
  ```
  *Backend logic for priority should consider scheduled time, tournament status, and category progression.*

---

### 💡 Notes for the Backend Developer:
1. **Round Numbering:** The frontend expects `round` to be a countdown. `1` is always the Final, `2` is Semi-Final, `3` is Quarter-Final, `4` is Round of 16, etc.
2. **Club Avoidance:** When generating the initial bracket (`POST /tournaments`), the backend must implement a "Club Avoidance" algorithm to ensure players from the same club do not fight each other in the early rounds unless mathematically unavoidable.
3. **Dates:** All dates sent from the frontend are ISO8601 strings. Please return them as ISO8601 strings or Unix timestamps.
4. **Images/Files:** For `POST /players`, if the frontend sends `FormData`, the backend should handle file uploads for `image` and `birthCertificate`, save them to storage (e.g., S3), and return the URLs in the `imageUrl` and `birthCertificateUrl` fields.