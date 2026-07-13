# Implementation Plan & Milestones

## Milestone 1: Foundation & Auth (Week 1)
- [ ] Initialize Node.js project with TypeScript, ESLint, Prettier.
- [ ] Setup PostgreSQL and Sequelize configurations.
- [ ] Implement `User` and `Club` models.
- [ ] Implement JWT Authentication and Role-Based Access Control (RBAC) middleware.

## Milestone 2: Tournament & Player Management (Week 2)
- [ ] Implement `Tournament` and `Player` models with Cloudinary `photoUrl` handling.
- [ ] Create CRUD APIs for Players and Tournaments.
- [ ] Implement backend logic to calculate and return player Age and Year of Birth from `dob`.

## Milestone 3: Matchmaking Engine (Week 3)
- [ ] Implement the bracket generation algorithm.
- [ ] Code the **Club Avoidance Fallback Logic** (Primary, Secondary, Tertiary rules).
- [ ] Implement the **15-minute Rest Period Tracker** validation during match scheduling.
- [ ] Create `POST /api/matches/generate` endpoint.

## Milestone 4: Live Match Execution & WebSockets (Week 4)
- [ ] Setup Socket.io server with room management (`match_<id>`).
- [ ] Implement Match State Machine (`SCHEDULED` → `IN_PROGRESS` → `PAUSED` → `FINISHED`).
- [ ] Build WebSocket handlers for `MATCH:ADD_POINT`, `MATCH:REMOVE_POINT`, `MATCH:END_ROUND`.
- [ ] Implement backend validation for `pointGapAutoEnd` (auto-trigger `MATCH:FINISHED_BY_POINT_GAP`).

## Milestone 5: State Sync, Testing & Polish (Week 5)
- [ ] Implement "State Synchronization" payload for clients reconnecting to a live match.
- [ ] Write unit tests for the Matchmaking Club Avoidance algorithm.
- [ ] Write integration tests for WebSocket scoring and auto-end validation.
- [ ] Final code review and API documentation (Swagger/OpenAPI).