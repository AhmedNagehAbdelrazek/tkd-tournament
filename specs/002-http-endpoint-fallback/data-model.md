# Data Model: HTTP Endpoint Fallback

**Date**: 2026-07-13

## No New Entities

This feature does not introduce new database entities. It reuses existing models:

### Existing Models Used

| Model | Table | Usage in This Feature |
|-------|-------|----------------------|
| Match | `matches` | State retrieval (`scorePlayer1`, `scorePlayer2`, `status`, `currentRound`) |
| MatchEvent | `match_events` | Audit trail for HTTP scoring operations (same as WebSocket) |
| Player | `players` | Player validation in scoring operations |
| Tournament | `tournaments` | Tournament settings (`pointGapAutoEnd`) for auto-end logic |

### State Transitions (No Changes)

The match state machine remains unchanged:

```
SCHEDULED → IN_PROGRESS → PAUSED ↔ IN_PROGRESS → FINISHED | CANCELLED
```

HTTP scoring operations only apply when `status = IN_PROGRESS`.

### In-Memory Rate Limiter State

The rate limiter uses an in-memory Map (not persisted):

```
Map<clientId, { timestamps: number[], cleanupTimer: NodeJS.Timeout }>
```

- **clientId**: `${userId}:${endpointPath}` (derived from JWT + request path)
- **timestamps**: Array of request timestamps within the sliding window (1 second)
- **cleanupTimer**: Periodic cleanup to prevent memory leaks

This data is ephemeral and resets on server restart — acceptable for a tournament system.
