# Specification: Taekwondo Match Management System

## Clarifications

### Session 2026-07-13

- Q: What are the maximum acceptable latency targets for real-time operations? → A: Scoring update: ≤500ms, State sync: ≤2s, Bracket generation: ≤10s
- Q: How should bulk player data be imported into the system? → A: Frontend parses Excel files and sends JSON array to backend API
- Q: Under what conditions can a match be cancelled? → A: Admin can cancel any match; Head Judge can cancel scheduled matches
- Q: How should the system handle WebSocket connection failures? → A: Server queues messages briefly; clients auto-reconnect on drop
- Q: What should happen to tournament data after the tournament ends? → A: Tournament becomes read-only; data preserved for historical records

## Overview
A real-time tournament management system for Taekwondo competitions that handles player registration, automated matchmaking with configurable rules, and live match execution with real-time scoring. The system enforces strict business rules including gender separation, weight classes, club avoidance, and rest periods, while acting as the Single Source of Truth for all match state.

## User Scenarios & Testing

### Primary User Scenarios

1. **Tournament Setup (Admin)**: Admin creates a tournament, configures weight classes (e.g., 10-15kg, 15-20kg), round durations (default 2 minutes), rest periods (15 minutes between matches), and point gap rules (auto-end at 20 points).

2. **Player Registration (Admin)**: Admin registers players individually or in bulk via Excel upload (frontend parses and sends JSON). System validates weight against tournament settings and calculates age/year of birth automatically.

3. **Bracket Generation (Head Judge)**: Head Judge triggers automated bracket generation for a specific weight class and gender. System applies club avoidance rules, flags intra-club matches with warnings, and ensures rest period compliance.

4. **Live Match Execution (Mat Judge)**: Mat Judge starts, pauses, resumes, and ends matches. Judges score points which are validated by backend before broadcast.

5. **Score Monitoring (Scorekeeper)**: Scorekeeper views real-time scores and match schedules on display boards without ability to modify state.

6. **Reconnection Sync**: Any client (judge, scorekeeper) that disconnects and reconnects automatically receives the current match state (scores, timer, round) from the backend.

### Acceptance Scenarios

1. **Given** a tournament with weight classes configured, **When** a player is registered outside those weight ranges, **Then** system rejects registration with appropriate error.

2. **Given** a bracket with players from different clubs, **When** bracket is generated, **Then** no two players from same club are matched unless mathematically impossible.

3. **Given** two players from same club are the only remaining in bracket, **When** bracket is generated, **Then** match is created with warning flag.

4. **Given** a club represents more than 50% of players in a weight class/gender bracket, **When** bracket is generated, **Then** club avoidance rule is relaxed for that entire bracket.

5. **Given** a player finished a match at 14:00, **When** scheduling next match for that player, **Then** system requires minimum 15-minute gap (next match at 14:15 or later).

6. **Given** a match in progress with score difference approaching 20 points, **When** point gap reaches configured threshold, **Then** backend automatically ends match and broadcasts point gap event.

7. **Given** a judge's tablet disconnects during live match, **When** device reconnects, **Then** backend sends current state with accurate scores, timer, and round.

8. **Given** a Mat Judge attempts to add points, **When** backend validates scoring rules, **Then** points are only applied if rules allow and broadcast to all connected clients.

### Edge Cases

1. **Empty Bracket**: No players registered for a specific weight class/gender combination - system should handle gracefully without errors.

2. **Single Player Bracket**: Only one player in a weight class - system should handle without creating matches.

3. **All Players Same Club**: When all players in a bracket are from the same club - club avoidance is automatically relaxed.

4. **Concurrent Scoring**: Multiple judges attempt to score simultaneously - backend serializes and validates each action.

5. **Timer Synchronization**: Network lag causes timer drift between clients - backend timer is authoritative, clients sync on reconnection.

6. **Rest Period Edge Case**: Player has match scheduled exactly at rest period boundary - system should accept scheduling at or after the minimum gap.

7. **Match Cancellation**: Match is cancelled after scores have been recorded - system preserves audit trail but excludes match from bracket progression.

## Requirements

### Functional Requirements

1. **FR-01**: System shall provide role-based access control with four roles: Admin, Head Judge, Mat Judge, Scorekeeper.

2. **FR-02**: System shall allow Admin to create and configure tournaments with weight classes, round durations, rest periods, and point gap rules. Completed tournaments become read-only for historical records.

3. **FR-03**: System shall allow Admin to register players with name, date of birth, weight, gender, club, and photo.

4. **FR-04**: System shall accept bulk player registration via JSON array (frontend parses Excel files client-side).

5. **FR-05**: System shall calculate and display player age and year of birth from full date of birth.

6. **FR-06**: System shall validate player weight against tournament weight class settings during registration.

7. **FR-07**: System shall generate brackets automatically based on tournament settings, applying gender separation and weight class filtering.

8. **FR-08**: System shall implement club avoidance logic: primary (no same club), secondary (flag intra-club if unavoidable), tertiary (relax if more than 50% same club).

9. **FR-09**: System shall enforce 15-minute minimum rest period between a player's matches.

10. **FR-10**: System shall provide real-time communication for live match execution.

11. **FR-11**: System shall implement match state machine: Scheduled to In Progress to Paused (can resume to In Progress) to Finished or Cancelled.

12. **FR-12**: System shall validate all scoring actions before updating state and broadcasting.

13. **FR-13**: System shall automatically end matches when point gap reaches configured threshold and broadcast event.

14. **FR-14**: System shall implement match cancellation: Admin can cancel any match; Head Judge can cancel scheduled matches only. Cancelled matches cannot be resumed.

15. **FR-15**: System shall maintain complete audit trail of all match events (start, pause, resume, end round, scoring, cancellation).

16. **FR-16**: System shall serve as Single Source of Truth, providing state synchronization to reconnected clients.

### Non-functional Requirements

1. **NFR-01**: System shall deliver scoring updates to all connected clients within 500ms of validation.

2. **NFR-02**: System shall synchronize reconnected clients within 2 seconds of reconnection.

3. **NFR-03**: System shall complete bracket generation within 10 seconds for up to 64 players.

4. **NFR-04**: System shall handle at least 10 concurrent matches with real-time scoring.

5. **NFR-05**: System shall persist all tournament, player, and match data durably.

6. **NFR-06**: System shall authenticate users with secure tokens and role-based authorization.

7. **NFR-07**: System shall validate all inputs and provide meaningful error messages.

8. **NFR-08**: System shall queue WebSocket messages briefly during client disconnections and deliver on reconnection.

## Success Criteria

1. **Tournament Setup Efficiency**: Admin can configure a complete tournament (settings + player registration) in under 30 minutes for 50 players.

2. **Bracket Generation Speed**: Automated bracket generation completes within 10 seconds for brackets with up to 64 players.

3. **Real-time Score Update**: Score changes appear on all connected devices within 500ms after validation.

4. **State Recovery**: Reconnected clients receive accurate current state within 2 seconds of reconnection.

5. **Rule Compliance**: System correctly enforces club avoidance in 100% of bracket generations where avoidance is mathematically possible.

6. **Rest Period Enforcement**: System correctly prevents scheduling violations in 100% of cases.

7. **User Satisfaction**: Mat Judges report scoring interface as intuitive and responsive (measured via post-tournament survey, target: 4+ out of 5).

8. **System Availability**: System maintains high availability during active tournament hours.

9. **Historical Data Access**: Completed tournament data remains accessible and queryable for historical records.

## Key Entities

- **User**: System users with roles (Admin, Head Judge, Mat Judge, Scorekeeper)
- **Club**: Organization to which players belong
- **Tournament**: Competition event with configurable settings; becomes read-only after completion
- **Player**: Competitor registered in a tournament with profile data
- **Match**: Scheduled or completed competition between two players
- **MatchEvent**: Audit trail entry for all match state changes and scoring

## Assumptions

1. **Default Match Format**: Standard Taekwondo rules apply: 3 rounds, 2 minutes per round, 1 minute rest between rounds (configurable per tournament).

2. **Weight Class Validation**: Players must be registered with accurate weight; system validates against tournament weight classes but does not perform physical weighing.

3. **Photo Storage**: Player photos are stored via external service; system stores URL reference only.

4. **Network Assumptions**: Clients have stable network connections; system handles reconnection gracefully, queues brief messages during disconnection, but does not implement full offline mode.

5. **Concurrent Access**: Multiple judges may be active on same match; system serializes scoring actions through backend validation.

6. **Tournament Scope**: Each tournament is independent; players are registered per tournament, not globally.

## Dependencies

1. **External Authentication Service**: Secure token-based authentication.

2. **Cloud Storage**: External service for player photo storage.

3. **Database**: Persistent storage for all tournament, player, and match data.

4. **Real-time Communication Infrastructure**: Technology for live match updates.

5. **Frontend Client**: Web application providing user interfaces for all roles (separate implementation).
