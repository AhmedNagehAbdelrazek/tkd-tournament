# Research: Gender-Specific Weight Classes

## R1: Gender-keyed weight class storage structure

**Decision**: Store `settings.weightClasses` as `{ MALE: [{name, min, max}], FEMALE: [{name, min, max}] }` — an object keyed by gender enum values, each mapping to an array of weight class definitions.

**Rationale**: This mirrors the existing `GENDERS` constant (`MALE`, `FEMALE`), aligns with how `generateBracket` already queries by gender, and keeps the structure self-documenting. The JSONB field on Tournament supports arbitrary nested structures without schema migration.

**Alternatives considered**:
- Flat array with a `gender` field per weight class: Rejected because it duplicates the gender key on every entry and makes gender-scoped queries more verbose.
- Separate `maleWeightClasses` / `femaleWeightClasses` fields: Rejected because it breaks the existing `settings.weightClasses` path and requires updating every consumer.

## R2: Backward compatibility for existing flat weight class arrays

**Decision**: Reject existing flat arrays with a clear validation error requiring reconfiguration. Do not auto-migrate.

**Rationale**: Auto-migration would require guessing which gender the flat array was intended for, which is impossible and dangerous. A clear error is safer and simpler. Since the system is early-stage with few production tournaments, manual reconfiguration is acceptable.

**Alternatives considered**:
- Auto-migrate by treating flat arrays as applies-to-all-genders: Rejected because it silently changes semantics — flat arrays had no gender separation, and forcing them into one gender would lose the other.
- Accept both formats with runtime detection: Rejected because it adds ongoing complexity and ambiguity about which format is canonical.

## R3: Excluded player evaluation algorithm

**Decision**: For each registered player in the tournament, look up `settings.weightClasses[player.gender]` and check if the player's weight falls within any range in that array. Players with no match are excluded.

**Rationale**: Simple iteration over players (max 500 per NFR) with array scan per player. For 500 players with 10 weight classes each, that's 5,000 comparisons — well within the 5-second NFR. No database indexing changes needed beyond existing tournament_id filter.

**Alternatives considered**:
- SQL-level range queries: Rejected because the weight class structure is in JSONB, making SQL-level range queries complex and database-specific.
- Caching excluded player lists: Rejected as premature optimization for the current scale.

## R4: Reason message generation

**Decision**: Generate reason strings programmatically based on the exclusion cause. Format: `"No {gender} weight class matches {weight}kg — available ranges: {list}"`.

**Rationale**: Provides actionable information to the admin. Listing available ranges helps them understand what weight classes exist and why the player doesn't fit. Follows NFR-02 (response clarity).

**Alternatives considered**:
- Static reason string ("No matching weight class"): Rejected because it's too vague and doesn't help admins fix the issue.
- Structured reason object with code + params: Rejected as over-engineering for the current use case; string is sufficient.

## R5: Tournament lock mechanism

**Decision**: Before allowing weight class updates, query the Match model for any match in the tournament with `status: 'IN_PROGRESS'`. If any exist, reject the update with a CONFLICT error.

**Rationale**: Uses the existing Match model and status field. Simple query with `tournamentId` + `status` filter. No new fields or state tracking needed. Aligns with spec requirement that settings are locked once matches begin.

**Alternatives considered**:
- Adding a `settingsLocked` boolean to Tournament: Rejected because it introduces a new field that could get out of sync with actual match state.
- Checking `isCompleted` flag: Rejected because `isCompleted` means the tournament is fully done, not just started. We need to check for in-progress matches specifically.

## R6: Excluded players endpoint design

**Decision**: `GET /api/tournaments/:id/excluded-players` — returns all players in the tournament whose weight doesn't match any weight class for their gender. Requires authentication (any role). Response shape: `{ data: { excludedPlayers: [...] } }`.

**Rationale**: Dedicated endpoint per spec FR-04. Uses `protect` middleware (consistent with existing GET endpoints). Response includes full player details + reason. The `findExcludedPlayers` service function is reusable across create/update response and this endpoint.

**Alternatives considered**:
- Including excluded players in the tournament GET /:id response: Rejected because it adds computation to every tournament read, even when not needed. Dedicated endpoint keeps concerns separated.
- POST endpoint: Rejected because it's a read-only operation with no side effects.

## R7: Tournament create/update response shape

**Decision**: The `create` and `updateSettings` responses include an `excludedPlayers` array alongside the tournament data. Shape: `{ data: { tournament: {...}, excludedPlayers: [...] } }`.

**Rationale**: Per spec FR-03 and user clarification, the response must include full excluded player details with reasons. Computing this at creation/update time gives admins immediate feedback without a follow-up call.

**Alternatives considered**:
- Separate response with just a count: Rejected per user clarification — full details required.
- Async notification: Rejected as over-engineering for synchronous operations.
