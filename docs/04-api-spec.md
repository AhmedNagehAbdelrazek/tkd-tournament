# API & WebSocket Specification

## 1. REST API Endpoints
### Authentication
- `POST /api/auth/login` → Returns JWT with user role.

### Tournament & Settings
- `POST /api/tournaments` → Create tournament with initial settings (weight classes, round durations, point gap rules).
- `GET /api/tournaments/:id` → Get tournament details and settings.

### Player Management
- `POST /api/players` → Create player (validates weight class against tournament settings).
- `GET /api/players?tournamentId=:id` → List players with calculated age and year of birth.

### Matchmaking Engine
- `POST /api/matches/generate` → Triggers bracket generation. 
  - *Payload*: `{ tournamentId, weightClass, gender, matchType }`
  - *Logic*: Applies Club Avoidance Fallback and 15-minute rest period checks. Returns generated matches with `intraClubWarning` flags if applicable.

### Live Match Execution (State Machine)
- `POST /api/matches/:id/start` → Transitions `SCHEDULED` to `IN_PROGRESS`.
- `POST /api/matches/:id/pause` → Transitions `IN_PROGRESS` to `PAUSED`.
- `POST /api/matches/:id/resume` → Transitions `PAUSED` to `IN_PROGRESS`.
- `POST /api/matches/:id/end` → Transitions to `FINISHED`, sets `winnerId`.

## 2. WebSocket Events (Socket.io)
### Client → Server (Actions)
- `MATCH:ADD_POINT` → Payload: `{ matchId, playerId, points, roundNumber }`
- `MATCH:REMOVE_POINT` → Payload: `{ matchId, playerId, points, roundNumber }`
- `MATCH:END_ROUND` → Payload: `{ matchId }`

### Server → Client (Broadcasts & Validation)
- `MATCH:STATE_UPDATE` → Payload: Full current match state (scores, round, timer, status). Emitted on state change and on client reconnection.
- `MATCH:SCORE_UPDATE` → Payload: `{ matchId, player1Score, player2Score, roundNumber }`
- `MATCH:FINISHED_BY_POINT_GAP` → Payload: `{ matchId, winnerId, reason: 'POINT_GAP_REACHED' }` (Triggered automatically by backend validation).
- `MATCH:REST_VIOLATION_WARNING` → Payload: `{ matchId, playerId, requiredRestMin }` (Emitted if a Head Judge tries to schedule a match violating the 15-min rule).