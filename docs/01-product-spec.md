# Product Specification: Taekwondo Match Management System

## 1. Overview
A real-time backend system for managing Taekwondo tournaments, player rankings, matchmaking, and live match execution. The system enforces strict business rules (gender separation, weight classes, club avoidance, rest periods) and acts as the Single Source of Truth (SSOT) for live scoring via WebSockets.

## 2. User Roles & Permissions (RBAC)
- **Admin**: Full access. Manage tournaments, settings, clubs, players, and override match states.
- **Head Judge**: Can generate brackets, approve/override matchmaking, and finalize match results.
- **Mat Judge**: Can start, pause, resume, and end rounds/matches. Can add/remove points.
- **Scorekeeper**: Read-only access to live scores and match schedules (e.g., for display boards).

## 3. Core Business Rules
### 3.1 Player & Club Rules
- Players belong to a single `Club`.
- Player profile requires: Name, Full Date of Birth (system calculates and displays Age and Year of Birth), Weight (kg), Gender, Club, and Photo (Cloudinary URL).

### 3.2 Matchmaking Constraints
- **Gender Separation**: Boys and Girls are matched in separate brackets.
- **Weight Classes**: Configurable per tournament (e.g., 10-15kg, 15-20kg). Players are only matched within their registered weight class.
- **Club Avoidance Fallback Logic**:
  1. **Primary**: Never match two players from the same club.
  2. **Secondary (Fallback)**: If mathematically impossible (e.g., only 2 players remain in the bracket and they are from the same club), allow the intra-club match but flag it with `intraClubWarning: true` in the API response.
  3. **Tertiary (Relaxation)**: If a single club represents >50% of the players in a specific weight class/gender bracket, the club avoidance rule is automatically relaxed for that entire bracket.
- **Rest Period Rule**: A player must have a minimum **15-minute gap** between the `endTime` of their last match and the `scheduledTime` of their next match.

### 3.3 Match & Scoring Rules
- **Match Types**: `SINGLE_ELIMINATION`, `ROUND_ROBIN`, `FRIENDLY`. Each match has exactly one type.
- **Round Format**: Default to standard Taekwondo rules (e.g., 3 rounds, 2 minutes per round, 1 minute rest between rounds), but all durations are **configurable** in Tournament Settings.
- **Point Gap Auto-End**: Configurable in Tournament Settings (e.g., if `pointGapAutoEnd` is 20, the backend automatically ends the match and broadcasts `MATCH:FINISHED_BY_POINT_GAP` when the score difference reaches 20).