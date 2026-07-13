Here is the complete, master **Specification Document**, explicitly divided into phases. This is designed to be saved as a single file (e.g., `SPECIFICATION.md` or `docs/master-spec.md`) in your repository. It is structured to be directly consumed by `spec-kit` workflows to drive your development step-by-step.

---

# 🥋 Taekwondo Match Management System: Master Specification

**Version:** 1.0.0  
**Status:** Approved for Implementation  
**Tech Stack:** Node.js, PostgreSQL, Sequelize, Socket.io, Cloudinary, JWT  

---

## 📌 PHASE 1: Product & Business Requirements

### 1.1 System Overview
A real-time backend system to manage Taekwondo tournaments, player rankings, algorithmic matchmaking, and live match execution. The backend acts as the **Single Source of Truth (SSOT)**, enforcing strict business rules and broadcasting real-time state to judges and display boards via WebSockets.

### 1.2 User Roles & Permissions (RBAC)
| Role | Permissions |
| :--- | :--- |
| **Admin** | Full system access. Manage tournaments, global settings, clubs, players, and override any match state. |
| **Head Judge** | Generate brackets, approve/override matchmaking, finalize match results, manage tournament settings. |
| **Mat Judge** | Control live match state (Start, Pause, Resume, End Round, End Match). Add/Remove points. |
| **Scorekeeper** | Read-only access to live scores, match schedules, and player info (for display boards). |

### 1.3 Core Business Rules
1. **Player Data**: Must store full Date of Birth (DOB). The API must calculate and return `age` and `yearOfBirth` dynamically. Photos are stored as Cloudinary URLs.
2. **Weight Classes**: Defined as ranges (e.g., `10-15kg`, `15-20kg`). Configurable per tournament. Players are only matched within their registered weight class.
3. **Gender Separation**: Male and Female players are strictly matched in separate brackets.
4. **Match Types**: Every match must have exactly one type: `SINGLE_ELIMINATION`, `ROUND_ROBIN`, or `FRIENDLY`.
5. **Rest Period Rule**: A player cannot be scheduled for a new match until **15 minutes** have passed since the `endTime` of their previous match.
6. **Round Format**: Default to standard WT rules (3 rounds, 2 mins/round, 1 min rest between rounds), but all durations are configurable in Tournament Settings.
7. **Point Gap Auto-End**: If the score difference between two players reaches the configurable `pointGapAutoEnd` threshold (e.g., 20 points), the backend must immediately halt scoring, end the match, and broadcast the auto-end event.

### 1.4 Matchmaking Algorithm: Club Avoidance Logic
The bracket generation engine must apply this exact fallback hierarchy:
1. **Primary Rule**: Never match two players from the same club.
2. **Secondary Fallback**: If mathematically impossible to avoid (e.g., only 2 players remain in a weight class and they share a club), generate the match but set `intraClubWarning: true` in the response payload.
3. **Tertiary Relaxation**: If a single club represents **>50%** of the total players in a specific weight class/gender bracket, the club avoidance rule is automatically disabled for that specific bracket to allow the tournament to proceed.

---

## 📌 PHASE 2: System Architecture & Tech Stack

### 2.1 Technology Choices
- **Runtime**: Node.js (v18+)
- **Database**: PostgreSQL
- **ORM**: Sequelize (with strict typing/validation)
- **Real-time**: Socket.io (Mandatory for live match module)
- **Authentication**: JWT (JSON Web Tokens) with role-guard middleware
- **Media Storage**: Cloudinary (Backend stores only the secure URL string)

### 2.2 Architectural Patterns
- **Single Source of Truth (SSOT)**: The PostgreSQL database is the absolute authority. If a judge's tablet disconnects and reconnects, the client must request the current match state from the backend, not rely on local memory.
- **State Machine**: Matches strictly follow: `SCHEDULED` → `IN_PROGRESS` → `PAUSED` ↔ `IN_PROGRESS` → `FINISHED` | `CANCELLED`.
- **Event-Driven Validation**: All scoring actions are intercepted by the backend, validated against rules (e.g., point gap, match status), saved to the audit log, and *then* broadcasted.

### 2.3 Real-Time Topology (Socket.io)
- **Namespace**: `/live-matches`
- **Room Strategy**: Each match has a dedicated room (e.g., `match_<matchId>`). Clients (judges, scorekeepers) join this room. 
- **Sync Event**: Upon joining a room, the server immediately emits a `MATCH:STATE_UPDATE` to synchronize the client.

---

## 📌 PHASE 3: Data Model Specification (Sequelize)

### 3.1 `User`
- `id`: UUID, Primary Key
- `name`: STRING
- `email`: STRING, Unique, Indexed
- `passwordHash`: STRING
- `role`: ENUM('ADMIN', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER')

### 3.2 `Club`
- `id`: UUID, Primary Key
- `name`: STRING, Unique, Indexed

### 3.3 `Tournament`
- `id`: UUID, Primary Key
- `name`: STRING
- `startDate`: DATE
- `endDate`: DATE
- `settings`: JSONB 
  - *Schema*: `{ "roundsCount": 3, "roundDurationSec": 120, "restBetweenRoundsSec": 60, "restBetweenMatchesMin": 15, "pointGapAutoEnd": 20, "weightClasses": [{"name": "10-15kg", "min": 10, "max": 15}] }`

### 3.4 `Player`
- `id`: UUID, Primary Key *(This is the "Player ID" exit requirement)*
- `name`: STRING
- `dob`: DATE *(Full date stored; age/year calculated on read)*
- `weight`: DECIMAL(5,2)
- `gender`: ENUM('MALE', 'FEMALE')
- `clubId`: UUID, ForeignKey → `Club.id`
- `tournamentId`: UUID, ForeignKey → `Tournament.id`
- `photoUrl`: STRING *(Cloudinary URL)*

### 3.5 `Match`
- `id`: UUID, Primary Key
- `tournamentId`: UUID, ForeignKey → `Tournament.id`
- `type`: ENUM('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'FRIENDLY')
- `player1Id`: UUID, ForeignKey → `Player.id`
- `player2Id`: UUID, ForeignKey → `Player.id`
- `scheduledTime`: TIMESTAMP
- `endTime`: TIMESTAMP, Nullable
- `status`: ENUM('SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED')
- `winnerId`: UUID, ForeignKey → `Player.id`, Nullable
- `currentRound`: INTEGER, Default: 1
- `player1Score`: INTEGER, Default: 0
- `player2Score`: INTEGER, Default: 0
- `intraClubWarning`: BOOLEAN, Default: false

### 3.6 `MatchEvent` *(Audit Trail)*
- `id`: UUID, Primary Key
- `matchId`: UUID, ForeignKey → `Match.id`
- `type`: ENUM('START', 'PAUSE', 'RESUME', 'END_ROUND', 'ADD_POINT', 'REMOVE_POINT', 'AUTO_END_BY_GAP', 'MANUAL_END')
- `playerId`: UUID, ForeignKey → `Player.id`, Nullable
- `points`: INTEGER, Nullable
- `roundNumber`: INTEGER
- `timestamp`: TIMESTAMP, Default: NOW()

---

## 📌 PHASE 4: API & WebSocket Contracts

### 4.1 REST API Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate and receive JWT. | No |
| `POST` | `/api/tournaments` | Create tournament with initial settings. | Admin, Head Judge |
| `GET` | `/api/tournaments/:id` | Get tournament details and settings. | All Authenticated |
| `POST` | `/api/players` | Create player (validates weight class). | Admin, Head Judge |
| `GET` | `/api/players` | List players (returns calculated `age` and `yearOfBirth`). | All Authenticated |
| `POST` | `/api/matches/generate` | Trigger bracket generation. Applies club avoidance & rest rules. | Head Judge, Admin |
| `POST` | `/api/matches/:id/start` | Transition `SCHEDULED` → `IN_PROGRESS`. | Mat Judge, Head Judge |
| `POST` | `/api/matches/:id/pause` | Transition `IN_PROGRESS` → `PAUSED`. | Mat Judge, Head Judge |
| `POST` | `/api/matches/:id/resume` | Transition `PAUSED` → `IN_PROGRESS`. | Mat Judge, Head Judge |
| `POST` | `/api/matches/:id/end` | Transition to `FINISHED`, set `winnerId`. | Head Judge |

### 4.2 WebSocket Events (Socket.io)
**Client → Server (Actions)**
- `MATCH:ADD_POINT` → Payload: `{ matchId, playerId, points, roundNumber }`
- `MATCH:REMOVE_POINT` → Payload: `{ matchId, playerId, points, roundNumber }`
- `MATCH:END_ROUND` → Payload: `{ matchId }`

**Server → Client (Broadcasts & Validation)**
- `MATCH:STATE_UPDATE` → Payload: Full current match object. *(Emitted on state change AND on client reconnection to room)*.
- `MATCH:SCORE_UPDATE` → Payload: `{ matchId, player1Score, player2Score, roundNumber }`
- `MATCH:FINISHED_BY_POINT_GAP` → Payload: `{ matchId, winnerId, reason: "POINT_GAP_REACHED" }` *(Triggered automatically by backend validation)*.
- `MATCH:REST_VIOLATION_WARNING` → Payload: `{ matchId, playerId, requiredRestMin: 15 }` *(Emitted if scheduling violates the 15-min rule)*.

---

## 📌 PHASE 5: Implementation Roadmap

### Milestone 1: Foundation & Authentication
- [ ] Initialize Node.js project with TypeScript, ESLint, Prettier.
- [ ] Configure PostgreSQL connection and Sequelize ORM.
- [ ] Implement `User` and `Club` models and seed initial roles.
- [ ] Build JWT Authentication middleware and Role-Based Access Control (RBAC) guards.

### Milestone 2: Tournament & Player Management
- [ ] Implement `Tournament` and `Player` models.
- [ ] Build CRUD APIs for Players and Tournaments.
- [ ] Implement helper functions to calculate `age` and `yearOfBirth` from `dob` on API responses.
- [ ] Integrate Cloudinary URL validation for `photoUrl`.

### Milestone 3: Matchmaking Engine
- [ ] Implement the bracket generation algorithm (`POST /api/matches/generate`).
- [ ] Code the **Club Avoidance Fallback Logic** (Primary, Secondary, Tertiary rules).
- [ ] Implement the **15-minute Rest Period Tracker** validation (query `Match` table for `playerId` where `endTime` is within the last 15 mins).
- [ ] Write unit tests specifically for the matchmaking edge cases.

### Milestone 4: Live Match Execution & WebSockets
- [ ] Setup Socket.io server with namespace `/live-matches` and room management.
- [ ] Implement Match State Machine transitions in REST controllers.
- [ ] Build WebSocket handlers for `MATCH:ADD_POINT`, `MATCH:REMOVE_POINT`, `MATCH:END_ROUND`.
- [ ] Implement backend validation: Check `pointGapAutoEnd` after every score change. If triggered, auto-update match status and emit `MATCH:FINISHED_BY_POINT_GAP`.

### Milestone 5: State Sync, Testing & Polish
- [ ] Implement "State Synchronization": When a client joins `match_<id>` room, immediately fetch and emit the latest `Match` and `MatchEvent` data.
- [ ] Write integration tests for WebSocket scoring flows.
- [ ] Generate Swagger/OpenAPI documentation for all REST endpoints.
- [ ] Final security review (ensure Mat Judges cannot access Admin routes, validate all UUIDs).

---

## 📌 PHASE 6: Testing & Validation Strategy

1. **Unit Testing**: 
   - Test the Club Avoidance algorithm with mock arrays of players (e.g., 60% Club A, 40% Club B).
   - Test the age/year calculation utility function.
2. **Integration Testing**:
   - Test the `/api/matches/generate` endpoint to ensure it rejects scheduling if the 15-minute rest rule is violated.
   - Test the WebSocket flow: Connect client → Emit `ADD_POINT` → Verify DB update → Verify `SCORE_UPDATE` broadcast.
3. **Edge Case Validation**:
   - What happens if a Mat Judge sends `ADD_POINT` for a match that is already `FINISHED`? (Backend must reject with `400 Bad Request`).
   - What happens if the point gap exactly equals the `pointGapAutoEnd` setting? (Backend must trigger auto-end immediately).

---

### 💡 How to use this with `spec-kit`

1. Save this entire document as `SPECIFICATION.md` in the root of your repository.
2. When using `spec-kit`, you can now reference specific phases. For example, you can prompt your AI coding assistant with:
   - *"Read `SPECIFICATION.md`. Let's start with **Phase 5, Milestone 1**. Generate the Sequelize models for User and Club, and the JWT auth middleware."*
   - *"Read `SPECIFICATION.md`, Phase 4. Generate the Socket.io event handlers for `MATCH:ADD_POINT` including the point gap auto-end validation."*

Would you like me to generate the actual **Phase 5, Milestone 1** code (Project setup, Sequelize models, and JWT Auth) to get you started right now?