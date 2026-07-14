# Research: Bracket Progression Flow

## Decision: Bracket Tree Architecture

**Decision**: Flat DB records with flat-to-nested transformation service

**Rationale**: The constitution mandates PostgreSQL via Sequelize ORM. Flat match records with `nextMatchId`/`nextMatchSlot` foreign keys provide relational integrity, efficient querying, and transactional safety. The nested JSON view is computed on read by a dedicated service layer, keeping the write path linear and simple.

**Alternatives considered**:
- **Nested document store (MongoDB)**: Would require adding a new database system, violating the existing PostgreSQL-only constraint.
- **Materialized tree (nested sets/adjacency lists in SQL)**: Over-engineered for a fixed-depth binary tree where depth is at most 6 (64 players). Simple FK links suffice.

---

## Decision: Progression Engine Trigger

**Decision**: Synchronous hook on match `FINISHED` state transition

**Rationale**: When a match ends, the winner must immediately occupy the next match slot. Synchronous execution within the match-end transaction ensures atomicity — if progression fails, the match end rolls back. This prevents orphaned matches where a match is finished but no winner advanced.

**Alternatives considered**:
- **Asynchronous queue (Bull/SQS)**: Adds infrastructure complexity and potential for race conditions (user sees finished match but no progression). Unnecessary for sub-second, single-row updates.
- **Polling/cron-based**: Would introduce unacceptable latency (seconds to minutes) and complexity.

---

## Decision: Bye Match Handling

**Decision**: Bye matches are pre-created as FINISHED records with `endReason: BYE`

**Rationale**: This allows the same progression engine to handle bye advancement without special-case logic. When the engine detects a FINISHED match on bracket load (or on generation), it automatically fills the next match slot. This is consistent with the existing spec-update document.

**Alternatives considered**:
- **Skip bye matches entirely**: Would require special-case logic in the bracket tree builder and progression engine. More complex, more bug-prone.
- **Virtual/placeholder matches**: Adds unnecessary abstraction; real DB records with FINISHED status are simpler.

---

## Decision: Bracket Response Structure

**Decision**: Nested JSON tree with `player1Source`/`player2Source` recursive references

**Rationale**: Frontend bracket renderers (e.g., react-brackets, bracket-tree libraries) typically consume nested tree structures where each match node contains its feeder matches as children. The recursive flat-to-nested transformation is O(N) for N matches and fits within the 2-second performance target for 64-player brackets.

**Alternatives considered**:
- **Flat array with stage groups**: Frontend would need to reconstruct the tree, duplicating logic across clients.
- **Hybrid: flat list + position metadata**: More flexible but increases frontend complexity; the tree is already determined by bracket generation.

---

## Integration Patterns

- **Progression endpoint**: Not exposed directly — progression is a side effect of match finish. The bracket tree is the only new public endpoint.
- **Socket broadcast**: BRACKET:UPDATED event follows existing Socket.IO room pattern (`match_<matchId>` or tournament-level room).
- **Club avoidance**: Already handled during bracket generation (spec 001). Progression engine is club-agnostic — it just advances winners.
- **Rest period**: Already enforced during match scheduling/generation. Progression engine does not add new rest period checks.

---

## Performance Considerations

- **Bracket tree generation**: O(N) where N = match count (max 63 for 64 players). Single query fetches all matches, then in-memory hash map builds the tree.
- **Progression**: O(1) — single match lookup + single row update.
- **Concurrent match conclusions**: Serialized by the match-end transaction (DB row-level locking on the finished match). The progression update targets a different row (`nextMatch`) so no lock contention.
- **Cache strategy**: No caching needed at this scope — bracket tree generation is fast enough. Can be revisited if profiling shows bottlenecks.
