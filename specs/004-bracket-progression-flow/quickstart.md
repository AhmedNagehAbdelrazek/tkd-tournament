# Quickstart: Bracket Progression Flow

## Database Migrations

Add columns to existing `Match` and `Player` tables:

```sql
-- Player model
ALTER TABLE players ADD COLUMN seed INTEGER;

-- Match model
ALTER TABLE matches ADD COLUMN next_match_id UUID REFERENCES matches(id);
ALTER TABLE matches ADD COLUMN next_match_slot VARCHAR(10) CHECK (next_match_slot IN ('PLAYER1', 'PLAYER2'));
ALTER TABLE matches ADD COLUMN stage_name VARCHAR(50) NOT NULL;
ALTER TABLE matches ADD COLUMN bracket_position INTEGER NOT NULL;
ALTER TABLE matches ADD COLUMN end_reason VARCHAR(30) CHECK (end_reason IN (
  'TIME_EXPIRED', 'POINT_GAP', 'WALKOVER', 'INJURY_WITHDRAWAL',
  'DISQUALIFICATION', 'REFEREE_STOPPAGE', 'GOLDEN_POINT', 'BYE'
));
```

## Key Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/services/BracketService.js` | Bracket generation, progression engine, flat-to-nested tree transformation |
| `src/controllers/BracketController.js` | GET /api/tournaments/:id/bracket handler |
| `src/routes/tournament.routes.js` (add route) | Mount the bracket endpoint |
| `src/utils/validators/bracket.validator.js` | Query parameter validation for bracket endpoint |
| `tests/unit/BracketService.test.js` | Unit tests for progression and tree transformation |
| `tests/integration/bracket.test.js` | Integration tests for bracket endpoint |
| `tests/contract/bracket.contract.test.js` | Contract tests for bracket response shape |

### Modified Files

| File | Changes |
|------|---------|
| `src/models/Match.js` | Add nextMatchId, nextMatchSlot, stageName, bracketPosition, endReason fields |
| `src/models/Player.js` | Add seed field |
| `src/services/MatchService.js` | Add progression engine call after match finishes |

## Test Strategy

1. **Unit tests** (`tests/unit/`):
   - `BracketService.progressWinner()` — basic progression, no progression on final match, progression with bye match
   - `BracketService.buildBracketTree()` — 8-player tree, 10-player tree (with byes), empty bracket, single match final
   - `BracketService.determineCurrentStage()` — all stages clear, mixed finished/scheduled, all finished

2. **Integration tests** (`tests/integration/`):
   - GET /api/tournaments/:id/bracket with valid params → 200 + correct tree shape
   - GET /api/tournaments/:id/bracket with missing params → 400
   - GET /api/tournaments/:id/bracket for non-existent tournament → 404
   - Match finish → progression → bracket tree reflects updated state

3. **Contract tests** (`tests/contract/`):
   - Validate bracket response shape matches contract/rest-api.md

## Verification Steps

1. Create tournament with 8 players in a weight class
2. Generate bracket → verify 7 matches created (4 QF + 2 SF + 1 Final)
3. Fetch bracket tree → verify nested JSON structure with correct stages
4. Finish a quarterfinal match → verify winner appears in semifinal slot
5. Fetch bracket tree again → verify BRACKET:UPDATED was broadcast
6. Finish all matches → verify champion is declared
7. Test with 10 players → verify 6 byes in Round of 16
8. Test manual override → Head Judge assigns player to next match slot
