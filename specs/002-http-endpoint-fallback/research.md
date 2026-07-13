# Research: HTTP Endpoint Fallback for WebSocket Failure

**Date**: 2026-07-13

## R1: Which match operations need HTTP fallback endpoints?

**Decision**: Expose scoring operations (ADD_POINT, REMOVE_POINT, END_ROUND) via HTTP POST. State retrieval already exists via `GET /api/matches/:id`. Match control (start/pause/resume/end/cancel) already exists via HTTP POST.

**Rationale**: The existing REST API at `Routes/matchRoutes.js` already provides:
- `GET /api/matches/:id` — state retrieval (FR-01 satisfied)
- `POST /api/matches/:id/start` — start match (FR-02 satisfied)
- `POST /api/matches/:id/pause` — pause match (FR-02 satisfied)
- `POST /api/matches/:id/resume` — resume match (FR-02 satisfied)
- `POST /api/matches/:id/end` — end match (FR-02 satisfied)
- `POST /api/matches/:id/cancel` — cancel match (FR-02 satisfied)

The only gap is scoring operations, which are currently WebSocket-only via `scoringHandler.js`:
- `MATCH:ADD_POINT` → needs HTTP equivalent
- `MATCH:REMOVE_POINT` → needs HTTP equivalent
- `MATCH:END_ROUND` → needs HTTP equivalent

**Alternatives considered**:
- Creating entirely new REST routes for all match operations — rejected as redundant (match control already works via HTTP)
- Using Server-Sent Events (SSE) for state updates — rejected per clarification (standard polling chosen)

## R2: How to implement per-client rate limiting?

**Decision**: In-memory sliding window counter per client (identified by JWT userId + IP). No external dependencies needed.

**Rationale**: Tournament system has bounded participants (judges, scorekeepers, admins). In-memory rate limiting is sufficient and avoids adding Redis or other dependencies. The rate limiter middleware extracts client identity from JWT token (already decoded in `tkdProtect` middleware) and falls back to IP address for unauthenticated requests (though all endpoints require auth).

**Implementation pattern**:
- Store request timestamps in a Map keyed by `${userId}:${endpoint}`
- Check count within 1-second window before processing
- Return 429 with `Retry-After: 1` header when exceeded
- Clean up stale entries periodically (every 60 seconds)

**Alternatives considered**:
- Redis-based rate limiting — rejected as overkill for bounded tournament participants
- Express-rate-limit package — rejected to avoid new dependency; simple in-memory solution is sufficient
- Token bucket algorithm — rejected; sliding window is simpler and sufficient for 2 req/sec limit

## R3: How to ensure state consistency between WebSocket and HTTP?

**Decision**: Both channels call the same service methods (scoringService.addPoint, scoringService.removePoint, scoringService.endRound). No separate state management needed.

**Rationale**: The existing `scoringService.js` already handles all validation (match status, player membership, point gap auto-end) and creates MatchEvent audit records. Since both WebSocket handlers (`scoringHandler.js`) and new HTTP controllers delegate to the same service methods, state consistency is guaranteed by design. The Match model's `scorePlayer1`/`scorePlayer2` fields and the MatchEvent table are the single source of truth.

**Alternatives considered**:
- Event queue for serialization — rejected; sequential DB transactions via service methods provide sufficient serialization
- Separate HTTP-specific state store — rejected; violates single source of truth principle

## R4: What validation rules apply to HTTP scoring endpoints?

**Decision**: Mirror the validation already present in `scoringService.js` and add express-validator rules for request body validation.

**Rationale**: The service layer already validates:
- Match exists and is IN_PROGRESS
- Player belongs to the match
- Points is a positive integer
- Round number is valid (1-3)
- Current round matches the round being scored

The new validator file (`matchValidator.js`) adds HTTP-specific request body validation:
- `playerId`: required, integer
- `points`: required, integer, min 1 (for addPoint)
- `roundNumber`: optional, integer, 1-3

**Alternatives considered**:
- Relying solely on service-level validation — rejected; HTTP endpoints should validate input shape before calling service (defense in depth)
- Duplicate validation logic — rejected; express-validator handles HTTP shape, service handles business rules

## R5: What should the HTTP polling response format look like?

**Decision**: Return the full match state object (same shape as `GET /api/matches/:id`) in all scoring response payloads.

**Rationale**: Per clarification, full state is returned on each request. The existing `matchService.getMatchState()` returns match with player1, player2, and latest MatchEvent. The scoring endpoints will return the updated match state after each operation, allowing clients to poll and get the latest state without a separate GET request.

**Response shape** (success):
```json
{
  "data": {
    "id": 1,
    "tournamentId": 1,
    "status": "IN_PROGRESS",
    "currentRound": 2,
    "scorePlayer1": 5,
    "scorePlayer2": 3,
    "player1": { "id": 1, "name": "...", "club": { "id": 1, "name": "..." } },
    "player2": { "id": 2, "name": "...", "club": { "id": 2, "name": "..." } },
    "latestEvent": { "type": "ADD_POINT", "createdAt": "..." }
  }
}
```

**Alternatives considered**:
- Minimal delta response (just changed fields) — rejected per clarification (full state chosen)
- Wrapping in envelope with metadata — rejected; existing pattern uses `{ data }` envelope
