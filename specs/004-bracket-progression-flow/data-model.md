# Data Model: Bracket Progression Flow

**Extends**: `specs/001-tkd-match-system/data-model.md`

## Player Model (Additions)

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `seed` | INTEGER | Nullable | Player seeding rank for bracket generation. Null = random shuffle |

## Match Model (Additions)

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `nextMatchId` | UUID (FK → Match) | Nullable | Points to the match this winner feeds into. Null for the Final match |
| `nextMatchSlot` | ENUM('PLAYER1', 'PLAYER2') | Nullable | Which slot the winner fills in nextMatch |
| `stageName` | STRING | Not null | e.g., "Round of 16", "Quarterfinal 1", "Semifinal", "Final" |
| `bracketPosition` | INTEGER | Not null | Ordering index for reconstructing the tree visually |
| `endReason` | ENUM('TIME_EXPIRED', 'POINT_GAP', 'WALKOVER', 'INJURY_WITHDRAWAL', 'DISQUALIFICATION', 'REFEREE_STOPPAGE', 'GOLDEN_POINT', 'BYE') | Nullable | Mandatory when match transitions to FINISHED |

### Match State Machine (Progression-Aware)

```
DRAFT → SCHEDULED → IN_PROGRESS → PAUSED ↔ IN_PROGRESS → FINISHED
                                                                  ↓
                                                          (Progression Engine)
                                                                  ↓
                                                    nextMatch.player1Id/player2Id
                                                    ← winnerId (automatic)

CANCELLED → (No progression — terminal state)
```

- When a match reaches `FINISHED`, the progression engine fires synchronously
- If `nextMatchId` is null (Final match), no progression occurs — bracket champion is identified
- Bye matches are created directly as `FINISHED` with `endReason: BYE` and trigger the same progression

## Bracket Tree (Computed, Not Stored)

The bracket tree is computed on read by BracketService via flat-to-nested transformation:

```
Format: Nested JSON with recursive player1Source/player2Source references
Root:   The Final match (nextMatchId is null)
Leaves: Round 1 matches (no feeder matches)
```

## Key Relationships

```
Match (winnerId) ──feeds into──→ nextMatch (nextMatchId + nextMatchSlot)
     ↑                                   ↑
     │                                   │
  Player                            Match (feeder match)
  (winner)                          (player1Source / player2Source)
```
