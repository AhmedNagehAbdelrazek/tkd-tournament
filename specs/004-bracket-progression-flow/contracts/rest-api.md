# REST API Contracts: Bracket Progression Flow

## GET /api/tournaments/:id/bracket

Get the nested bracket tree for a specific weight class and gender.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `weightClass` | string | Yes | Weight class slug (e.g., "10-15kg") |
| `gender` | string | Yes | Gender (`MALE` or `FEMALE`) |

### Response

**Status**: 200 OK

```json
{
  "data": {
    "tournamentId": "uuid",
    "weightClass": "10-15kg",
    "gender": "MALE",
    "currentRound": 1,
    "totalRounds": 4,
    "bracket": {
      "Round 1": [
        { "id": 1, "status": "FINISHED", "player1": { "name": "Player A" }, "player2": null, "winnerId": 1, "isBye": true, "endReason": "BYE" },
        { "id": 2, "status": "SCHEDULED", "player1": { "name": "Player B" }, "player2": { "name": "Player C" } }
      ],
      "Round 2": [
        { "id": 3, "status": "PENDING", "player1": null, "player2": null },
        { "id": 4, "status": "PENDING", "player1": null, "player2": null }
      ],
      "Round 3": [
        { "id": 5, "status": "PENDING", "player1": null, "player2": null }
      ],
      "Round 4": [
        { "id": 6, "status": "PENDING", "player1": null, "player2": null }
      ]
    }
  }
}
```

### Error Responses

**Status**: 404 Not Found — Tournament not found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Tournament not found"
  }
}
```

**Status**: 400 Bad Request — Missing required query parameters
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "weightClass and gender are required",
    "details": [
      { "field": "weightClass", "message": "Weight class is required", "value": null }
    ]
  }
}
```

## POST /api/tournaments/:id/bracket/override

Manually assign a player to a next-match slot (Head Judge only).

### Request Body

```json
{
  "matchId": 1,
  "playerId": 5
}
```

### Response

**Status**: 200 OK

```json
{
  "data": {
    "nextMatchId": 3,
    "slot": "PLAYER1",
    "playerId": 5
  }
}
```

### Error Responses

**Status**: 404 Not Found — Match not found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Match not found"
  }
}
```

**Status**: 409 Conflict — Target match is already finished
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Cannot override: target match is already finished"
  }
}
```

### Notes

- The `bracket` object is keyed by round name (e.g., `"Round 1"`, `"Round 2"`) containing arrays of matches
- Each match has `id`, `status`, `player1` (with `name`), and `player2` (with `name`)
- `currentRound` is the highest round number with at least one active (IN_PROGRESS or SCHEDULED) match
- `totalRounds` is the total number of rounds in the bracket
- Matches with no player assigned yet have `player1`/`player2` as `null`
- Bye matches appear as FINISHED with a single player and `isBye: true`
- Empty rounds are omitted from the response
