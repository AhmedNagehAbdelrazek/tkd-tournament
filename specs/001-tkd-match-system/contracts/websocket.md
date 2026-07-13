# WebSocket Contract: Taekwondo Match Management System

**Server**: Socket.io

**Namespace**: `/live-matches`

**Authentication**: JWT token in handshake auth

## Connection

### Client Connects

**Auth Payload**:
```json
{
  "token": "jwt_token"
}
```

**On Success**:
- Client connected to namespace
- Can join match rooms

**On Failure**:
- Connection rejected
- Error: "Authentication required"

## Room Management

### Joining a Match Room

**Event**: `join_match`

**Payload**:
```json
{
  "matchId": "uuid"
}
```

**Server Response**:
- Adds client to room `match_<matchId>`
- Emits current match state to client

### Leaving a Match Room

**Event**: `leave_match`

**Payload**:
```json
{
  "matchId": "uuid"
}
```

**Server Action**:
- Removes client from room `match_<matchId>`

## Client → Server Events

### MATCH:ADD_POINT

**Purpose**: Add points to a player

**Authorization**: MAT_JUDGE only

**Payload**:
```json
{
  "matchId": "uuid",
  "playerId": "uuid",
  "points": 3,
  "roundNumber": 1
}
```

**Validation**:
- Match must be in IN_PROGRESS status
- Player must be in the match
- Points must be positive integer
- Round must be valid (1-3)
- Judge must be authorized for this match

**Success Response**:
```json
{
  "success": true,
  "eventId": "uuid"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ACTION",
    "message": "Match not in progress"
  }
}
```

### MATCH:REMOVE_POINT

**Purpose**: Remove points from a player

**Authorization**: MAT_JUDGE only

**Payload**:
```json
{
  "matchId": "uuid",
  "playerId": "uuid",
  "points": 3,
  "roundNumber": 1
}
```

**Validation**: Same as ADD_POINT

### MATCH:END_ROUND

**Purpose**: End current round and advance to next

**Authorization**: MAT_JUDGE only

**Payload**:
```json
{
  "matchId": "uuid"
}
```

**Validation**:
- Match must be in IN_PROGRESS
- Current round must be less than max rounds

### MATCH:REQUEST_STATE

**Purpose**: Request current match state (for reconnection)

**Authorization**: Any authenticated user in match room

**Payload**:
```json
{
  "matchId": "uuid"
}
```

## Server → Client Events

### MATCH:STATE_UPDATE

**Purpose**: Broadcast full match state (sent on state change and reconnection)

**Payload**:
```json
{
  "matchId": "uuid",
  "status": "IN_PROGRESS",
  "currentRound": 2,
  "player1": {
    "id": "uuid",
    "name": "string",
    "score": 45
  },
  "player2": {
    "id": "uuid",
    "name": "string",
    "score": 30
  },
  "timer": {
    "roundTimeRemaining": 90,
    "roundDuration": 120,
    "restTimeRemaining": 0,
    "restDuration": 60
  },
  "lastEvent": {
    "type": "ADD_POINT",
    "playerId": "uuid",
    "points": 3,
    "roundNumber": 2,
    "timestamp": "timestamp"
  }
}
```

### MATCH:SCORE_UPDATE

**Purpose**: Broadcast score change to all clients

**Payload**:
```json
{
  "matchId": "uuid",
  "player1Score": 45,
  "player2Score": 30,
  "roundNumber": 2,
  "timestamp": "timestamp"
}
```

### MATCH:ROUND_END

**Purpose**: Broadcast round end

**Payload**:
```json
{
  "matchId": "uuid",
  "roundNumber": 1,
  "player1Score": 20,
  "player2Score": 15,
  "nextRoundStart": "timestamp"
}
```

### MATCH:FINISHED

**Purpose**: Broadcast match completion

**Payload**:
```json
{
  "matchId": "uuid",
  "winnerId": "uuid",
  "winnerName": "string",
  "finalScore": {
    "player1": 45,
    "player2": 30
  },
  "endTime": "timestamp"
}
```

### MATCH:FINISHED_BY_POINT_GAP

**Purpose**: Broadcast automatic match end due to point gap

**Payload**:
```json
{
  "matchId": "uuid",
  "winnerId": "uuid",
  "winnerName": "string",
  "reason": "POINT_GAP_REACHED",
  "finalScore": {
    "player1": 45,
    "player2": 25
  },
  "endTime": "timestamp"
}
```

### MATCH:PAUSED

**Purpose**: Broadcast match pause

**Payload**:
```json
{
  "matchId": "uuid",
  "pausedAt": "timestamp"
}
```

### MATCH:RESUMED

**Purpose**: Broadcast match resume

**Payload**:
```json
{
  "matchId": "uuid",
  "resumedAt": "timestamp"
}
```

### MATCH:CANCELLED

**Purpose**: Broadcast match cancellation

**Payload**:
```json
{
  "matchId": "uuid",
  "cancelledAt": "timestamp",
  "cancelledBy": "uuid"
}
```

### MATCH:REST_VIOLATION_WARNING

**Purpose**: Warn Head Judge of rest period violation

**Payload**:
```json
{
  "matchId": "uuid",
  "playerId": "uuid",
  "playerName": "string",
  "requiredRestMin": 15,
  "availableRestMin": 8,
  "nextMatchTime": "timestamp"
}
```

### MATCH:TIMER_SYNC

**Purpose**: Synchronize timer across clients (sent every 10 seconds)

**Payload**:
```json
{
  "matchId": "uuid",
  "serverTime": "timestamp",
  "roundTimeRemaining": 90,
  "isPaused": false
}
```

## Error Events

### ERROR

**Purpose**: Generic error notification

**Payload**:
```json
{
  "code": "SCORING_VALIDATION_FAILED",
  "message": "Cannot add points: match not in progress",
  "matchId": "uuid"
}
```

## Connection Lifecycle

### Client Disconnects

**Server Action**:
- Remove client from all rooms
- No broadcast (other clients unaffected)

### Client Reconnects

**Server Action**:
- Client re-authenticates
- Client re-joins previous rooms
- Server emits MATCH:STATE_UPDATE for each room

### Server Queue (During Disconnection)

**Behavior**:
- Server queues events for disconnected clients
- Queue duration: 30 seconds
- On reconnect, queued events are delivered in order
- After 30 seconds, queue is cleared; client must request full state

## Event Flow Example

```text
1. Judge connects → Authentication
2. Judge joins match room → Receives STATE_UPDATE
3. Judge sends ADD_POINT → Server validates
4. Server emits SCORE_UPDATE → All clients in room
5. If point gap reached → Server emits FINISHED_BY_POINT_GAP
6. Judge sends END_ROUND → Server advances round
7. Server emits ROUND_END → All clients in room
8. All clients receive TIMER_SYNC every 10 seconds
```

## Rate Limiting

**Client Limits**:
- ADD_POINT: 10 per second
- REMOVE_POINT: 10 per second
- END_ROUND: 1 per second

**Server Response on Rate Limit**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many scoring requests"
  }
}
```
