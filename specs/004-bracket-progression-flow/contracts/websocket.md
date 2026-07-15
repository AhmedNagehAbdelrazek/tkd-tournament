# WebSocket Contracts: Bracket Progression Flow

## BRACKET:UPDATED (Server → Client)

Emitted when a winner advances to the next match slot, signaling all clients to refetch the bracket tree.

### Payload

```json
{
  "tournamentId": 1,
  "weightClass": "10-15kg",
  "gender": "MALE"
}
```

### Trigger

- After `MATCH:END` processing completes and `progressWinner` successfully fills a next match slot
- After `POST /api/matches/:id/end` REST endpoint completes with progression

### Client Action

Receiving clients should call `GET /api/tournaments/:id/bracket?weightClass=...&gender=...` to get the updated bracket tree.

## MATCH:END (Client → Server)

End a match and declare a winner.

### Payload

```json
{
  "matchId": 1,
  "winnerId": 2,
  "endReason": "TIME_EXPIRED"
}
```

### Auth

`MAT_JUDGE` role required.

### Response (Callback)

```json
{
  "success": true,
  "matchId": 1,
  "winnerId": 2
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ACTION",
    "message": "Invalid state transition"
  }
}
```
