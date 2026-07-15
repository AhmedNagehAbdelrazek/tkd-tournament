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
    "currentStage": "Quarterfinal",
    "bracket": {
      "id": "uuid",
      "stageName": "Final",
      "status": "SCHEDULED",
      "bracketPosition": 7,
      "player1": { "id": "uuid", "name": "Player A" },
      "player2": { "id": "uuid", "name": "Player B" },
      "player1Source": {
        "id": "uuid",
        "stageName": "Semifinal 1",
        "status": "FINISHED",
        "winnerId": "uuid",
        "bracketPosition": 5,
        "player1Source": {
          "id": "uuid",
          "stageName": "Quarterfinal 1",
          "status": "FINISHED",
          "winnerId": "uuid",
          "bracketPosition": 1,
          "winner": { "id": "uuid", "name": "Player A" }
        },
        "player2Source": {
          "id": "uuid",
          "stageName": "Quarterfinal 2",
          "status": "FINISHED",
          "winnerId": "uuid",
          "bracketPosition": 2,
          "winner": { "id": "uuid", "name": "Player C" }
        },
        "winner": { "id": "uuid", "name": "Player A" }
      },
      "player2Source": {
        "id": "uuid",
        "stageName": "Semifinal 2",
        "status": "SCHEDULED",
        "bracketPosition": 6,
        "player1Source": {
          "id": "uuid",
          "stageName": "Quarterfinal 3",
          "status": "IN_PROGRESS",
          "bracketPosition": 3
        },
        "player2Source": {
          "id": "uuid",
          "stageName": "Quarterfinal 4",
          "status": "FINISHED",
          "winnerId": "uuid",
          "bracketPosition": 4,
          "winner": { "id": "uuid", "name": "Player F" }
        }
      }
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

- The `bracket` object is the Final match node, recursively populated with `player1Source`/`player2Source` for feeder matches
- Feeder matches that haven't finished yet have no `winnerId` or `winner` field
- Feeder matches that haven't started yet have no `player1`/`player2` fields (both null)
- Bye matches appear as FINISHED matches with a single player in their stage
- Stages with zero matches are omitted from the response
