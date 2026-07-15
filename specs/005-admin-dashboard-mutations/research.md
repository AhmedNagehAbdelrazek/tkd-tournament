# Research: Admin Dashboard Mutations

## R1: Pagination Integration

**Decision**: Wire existing `parsePagination` and `buildPaginationMeta` utilities into all list service functions. Use `paginatedResponse` in controllers for list endpoints.

**Rationale**: The utilities already exist in `utils/pagination.js` with the correct defaults (page=1, limit=20, max=100) matching the spec clarification. `paginatedResponse` in `utils/httpResponse.js` wraps responses in `{ data, meta }` format. No new code needed — just wiring.

**Alternatives considered**:
- Custom pagination per endpoint: Rejected — duplicates existing utilities.
- Cursor-based pagination: Rejected — overkill for admin dashboard with <1000 records. Offset-based is sufficient.

**Impact**: List endpoints will change response shape from `{ players, total }` to `{ data: [...], meta: { page, limit, total, totalPages } }`. This is a breaking change for existing list endpoints — acceptable since this is a new feature addition.

## R2: Admin Guard Extraction

**Decision**: Extract the inline `adminGuard` from `tournamentRoutes.js` into a shared middleware (e.g., `middlewares/adminGuard.js` or add to `roleGuard.js`).

**Rationale**: The guard is currently defined inline in `tournamentRoutes.js` and checks both global admin role and TKD ADMIN role. The spec clarifies that entity CRUD uses global admin role only (clarification Q1). The shared middleware should enforce: `req.user.globalRole === 'admin' || req.user.globalRole === 'super_admin'`.

**Alternatives considered**:
- Keep inline and duplicate per route file: Rejected — violates DRY, harder to maintain.
- Use existing `roleGuard` with `['admin', 'super_admin']`: Rejected — `roleGuard` only checks `globalRole`, which is correct for the clarified requirement. But the existing inline `adminGuard` also checks TKD ADMIN, which we want to remove per clarification Q1.

**Impact**: The new shared `adminGuard` will be stricter (global admin only). Existing tournament routes that use the inline guard will need updating to use the shared version.

## R3: AuditLog Model Design

**Decision**: Create a new `AuditLog` Sequelize model with INTEGER PK, following existing conventions. Fields: `id`, `actorId` (INTEGER FK to users), `action` (ENUM: CREATE, UPDATE, DELETE, ASSIGN_ROLE, REVOKE_ROLE, DEACTIVATE, REACTIVATE, MARK_COMPLETE), `entityType` (STRING — 'player', 'club', 'tournament', 'user'), `entityId` (INTEGER), `metadata` (JSONB — captures changed fields, old/new values for updates), `createdAt` (TIMESTAMP). No `updatedAt` (immutable log).

**Rationale**: Matches the spec clarification (Q4) and constitution principle IV. Uses INTEGER PK for consistency with other models (not UUID). JSONB metadata allows flexible capture of what changed without schema migrations for each entity type. Non-blocking writes (catch errors, log to console only) per constitution.

**Alternatives considered**- UUID PK: Rejected — all existing models use INTEGER PKs.
- Separate audit tables per entity: Rejected — over-engineered for this scale.
- Reusing MatchEvent: Rejected — MatchEvent has match-specific fields (roundNumber, points) that don't apply to entity CRUD.
- Application-level logging only: Rejected — spec requires persistent audit trail.

## R4: Match Conflict Detection Algorithm

**Decision**: When scheduling/rescheduling a match, compute the conflict window as `tournament.settings.roundDurationSec * maxRounds` (where maxRounds is derived from the tournament's weight class configuration or a default of 3 rounds). Check if any other SCHEDULED match for either player falls within `[proposedTime - window, proposedTime + window]`.

**Rationale**: Matches the spec clarification (Q3). Uses existing tournament settings. No new fields needed on Match. The window represents the worst-case match duration (all rounds go to time).

**Alternatives considered**- Fixed 30-minute buffer: Rejected — too rigid, doesn't adapt to tournament configuration.
- Exact time only: Rejected — misses realistic conflicts.
- New `durationEstimate` field on Match: Rejected — adds complexity, requires manual input.

**Implementation**: Add a `checkConflict(playerId, proposedTime, excludeMatchId, tournamentId)` helper in `matchService.js`. It queries `Match.findAll({ where: { tournamentId, status: SCHEDULED, [Op.or]: [{ player1Id: playerId }, { player2Id: playerId }] } })` and checks each for time overlap.

## R5: Tournament Lifecycle State Clarification

**Decision**: The existing `isCompleted` boolean on Tournament is sufficient. "Created with status pending" (AC3) is equivalent to `isCompleted: false`. No new status field needed.

**Rationale**: The spec says "The existing data model and entity relationships remain largely unchanged" (Assumption). A boolean `isCompleted` field captures the only meaningful lifecycle state for tournament management: not-completed vs completed. Additional states (e.g., ACTIVE, ARCHIVED) are not required by any functional requirement.

**Alternatives considered**- Add a `status` enum field: Rejected — no functional requirement needs states beyond pending/completed. Would require migration and update to all tournament queries.
- Add `isArchived` field: Rejected — not in spec, can be added later if needed.

## R6: Walkover Match Ending

**Decision**: Walkover uses the existing `endMatch` service function with `endReason: 'WALKOVER'`. The caller specifies which player is the winner (the non-walking-over player). The walkover endpoint validates: match exists, is in SCHEDULED or IN_PROGRESS status, both players exist, winner is one of the two match players.

**Rationale**: Reuses existing match ending infrastructure. The `END_REASONS` enum already includes `WALKOVER`. No new state transitions needed — walkover is just a specific way to reach FINISHED status.

**Alternatives considered**- New walkover-specific service function: Rejected — unnecessary duplication of endMatch logic.
- Walkover as a separate status: Rejected — FINISHED with endReason=WALKOVER is the correct semantic.

## R7: Bulk Player Creation Validation

**Decision**: Bulk creation uses a database transaction. All player names within the same tournament are checked for uniqueness before any inserts. If any duplicate is found, the entire batch is rejected with a 422 error listing the failing entries (name + row index). No partial inserts.

**Rationale**: Matches spec EC5 and FR-PM-05. Transaction ensures atomicity. Pre-validation prevents partial data. The existing `Player` model has no unique constraint on (name, tournamentId), so uniqueness must be checked in application logic.

**Alternatives considered**- Upsert/merge strategy: Rejected — spec says "reject the entire batch."
- Partial insert with error report: Rejected — spec says "reject the entire batch."
- Database-level unique constraint: Rejected — would require migration and may conflict with players in different tournaments having the same name.
