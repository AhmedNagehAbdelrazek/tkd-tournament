# Specification: Bracket Progression Flow

## Overview

Extend the bracket system to handle match conclusion and automatic progression through single-elimination rounds. When a match finishes, the winner must advance to the next round, and the bracket must reflect this progression. The system must handle variable bracket sizes (any number of players, not just perfect powers of 2) by using bye matches. Additionally, the frontend must display the bracket tree correctly regardless of the number of rounds or the inconsistency in how many matches appear at each stage (e.g., 8-player brackets have 4 quarterfinal matches, 16-player brackets have 8, 32-player brackets have 16, etc.).

## User Scenarios & Testing

### Primary User Scenarios

1. **Match Concluded — Automatic Advancement**: A Mat Judge ends a match with a winner. The system automatically places that winner into the correct slot in the next round's match. All connected clients see the updated bracket immediately.

2. **Bye Round Resolution**: A player receives a bye in the first round because the bracket has an uneven number of players. The system treats the bye as a finished match, and the progression engine automatically places that player into round 2.

3. **Bracket Viewing (Variable Stages)**: A Head Judge views the bracket tree for a weight class with 10 players (bracket size 16). The bracket displays Round of 16 (with byes), Quarterfinals (4 matches), Semifinals (2 matches), and Final (1 match). The system correctly renders each stage regardless of how many actual matches exist in it.

4. **Progression Through Multiple Rounds**: A player wins their quarterfinal match, then their semifinal match, and ultimately the final. After each win, the bracket updates to show their advancement until they are crowned champion.

### Acceptance Scenarios

1. **Given** a match in `FINISHED` status with a declared `winnerId`, **When** the match has a `nextMatchId` and `nextMatchSlot`, **Then** the system automatically assigns the winner to the correct player slot in the next match.

2. **Given** a player receives a bye (match ends with `endReason: BYE`), **When** the bye match transitions to `FINISHED`, **Then** the progression engine fills the next match slot with that player just as it would for any other finished match.

3. **Given** a bracket with 10 players (bracket size 16), **When** the bracket tree is fetched, **Then** the response includes Round of 16 (6 bye matches + 2 actual matches), Quarterfinal (4 matches), Semifinal (2 matches), Final (1 match) — showing the correct count at each stage.

4. **Given** a bracket tree is displayed, **When** a user views a stage that has no matches yet (all still `DRAFT` or not yet advanced), **Then** the stage is still rendered with empty/unfilled slots for matches that will be populated as winners advance.

5. **Given** a match is the final match (no `nextMatchId`), **When** that match finishes, **Then** the progression engine takes no further action, and the tournament bracket shows the winner as the tournament champion for that weight class and gender.

6. **Given** a player wins a match, **When** the progression engine updates the next match's player slot, **Then** a `BRACKET:UPDATED` event is broadcast to all connected clients in the tournament room.

### Edge Cases

1. **Player Withdrawal After Advancement**: A player wins a match and advances but then withdraws before their next match. The system must allow the Head Judge to mark their next match as a walkover.

2. **Empty Bracket Stages**: A stage with no matches (e.g., Round of 32 in an 8-player bracket tree) — the system should not render empty stages, only those that contain matches.

3. **Bracket Size Mismatch**: The frontend receives a bracket tree where the number of matches doesn't exactly match the expected power-of-2 pattern — the system must handle variable match counts at each stage gracefully.

4. **Simultaneous Match Conclusions**: Two matches in the same bracket conclude at nearly the same time, both feeding into the same next round match — the system serializes updates and both winners are placed in their correct slots.

5. **No Players in Next Slot**: A next match's player slot is still `null` because the other feeder match hasn't finished yet — the bracket displays an empty/unfilled slot for that player.

## Requirements

### Functional Requirements

1. **FR-01**: When a match transitions to `FINISHED`, the system shall automatically identify the winner and advance them to the appropriate slot in the next match (as indicated by `nextMatchId` and `nextMatchSlot`).

2. **FR-02**: The system shall handle bye matches (generated as `FINISHED` with `endReason: BYE`) through the same progression engine as standard matches.

3. **FR-03**: The system shall broadcast a `BRACKET:UPDATED` notification to all connected clients whenever any winner advances to the next match.

4. **FR-04**: The bracket tree response shall include all matches grouped by stage, regardless of how few or how many matches exist in each stage, rendering only stages that contain matches.

5. **FR-05**: The bracket tree shall display empty/unfilled player slots for matches that are waiting on winners from unfinished feeder matches.

6. **FR-06**: The system shall allow the Head Judge to override a scheduled next-match slot (e.g., to mark a walkover if the advanced player withdraws).

7. **FR-07**: The bracket tree end point shall identify the current active stage — the deepest stage where at least one match is `IN_PROGRESS` or `SCHEDULED`.

8. **FR-08**: The system shall support manual bracket progression override: a Head Judge can manually assign a player to a next-match slot if the automatic progression cannot determine the winner (e.g., both players disqualified).

### Non-functional Requirements

1. **NFR-01**: The bracket tree response shall be generated and returned within 2 seconds for brackets with up to 64 players.
2. **NFR-02**: The progression engine shall process a match conclusion and advance the winner within 1 second of the match becoming `FINISHED`.
3. **NFR-03**: The bracket tree response shall correctly represent all stages regardless of the total number of players registered.

## Success Criteria

1. **Automatic Advancement**: 100% of match conclusions correctly advance the winner to the correct slot in the next match, verified across all bracket sizes (8, 16, 32, 64 players).
2. **Bye Resolution**: Players with byes are automatically placed in the next round without any manual intervention.
3. **Bracket Display Accuracy**: The bracket tree correctly displays all stages with the correct match counts for any valid player count (e.g., 10 players → 6 bye + 2 R1 matches, 4 QF, 2 SF, 1 Final).
4. **Progression Latency**: The winner appears in the next match slot within 1 second of the current match concluding.
5. **Bracket Refresh**: After any match conclusion, all connected clients receive the bracket update notification and see the updated tree within 3 seconds.
6. **Manual Override**: Head Judges can override automatic progression for edge cases (withdrawal, double disqualification, etc.).

## Key Entities

- **Bracket Tree**: The nested JSON structure representing all matches in a single-elimination tournament for a given weight class and gender.
- **Progression Engine**: The automated logic that advances winners from finished matches to their next match slots.
- **Stage**: A round in the bracket (e.g., "Quarterfinal", "Semifinal") containing one or more matches.
- **Bye Match**: A match created as already `FINISHED` when the bracket has an uneven number of players.
- **Next Match Slot**: The specific player position (`PLAYER1` or `PLAYER2`) in the next round's match that a winner fills.

## Assumptions

1. **Single Elimination Only**: Bracket progression follows single-elimination format. No consolation brackets or repechage are included in this scope.
2. **Bracket Size Fixed After Generation**: Once bracket matches are generated for a weight class and gender, the bracket tree structure (number of matches, nextMatchId links) does not change even if players withdraw before their matches.
3. **Withdrawals After Advancement**: If a player withdraws after advancing, the Head Judge manually handles the next match (e.g., marks it as walkover). This is not handled automatically.
4. **Progression Order**: When a match finishes, the progression engine fires synchronously as part of the match end transaction.
5. **Champion Identification**: The winner of the final match (match with no `nextMatchId`) is considered the bracket champion.

## Dependencies

1. **Match Lifecycle System**: The match state machine (SCHEDULED, IN_PROGRESS, PAUSED, FINISHED, CANCELLED) must be implemented and stable.
2. **Bracket Generation System**: The bracket tree (matches with `nextMatchId`, `nextMatchSlot`, `stageName`, `bracketPosition`) must be generated before progression can function.
3. **Notification Infrastructure**: The system must support broadcasting `BRACKET:UPDATED` events to connected clients.
4. **Frontend Bracket Display**: The frontend must be capable of rendering the nested JSON bracket tree with variable match counts per stage.
