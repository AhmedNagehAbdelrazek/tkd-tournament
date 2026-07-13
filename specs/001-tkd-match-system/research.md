# Research: Taekwondo Match Management System

**Date**: 2026-07-13

## Technical Decisions

### 1. Real-time Communication

**Decision**: Socket.io over raw WebSockets

**Rationale**:
- Built-in room management for match-specific channels
- Automatic reconnection handling with state sync
- Fallback to long-polling for restricted networks
- Event-based architecture matches scoring event model

**Alternatives Considered**:
- Raw WebSockets: More control but requires manual reconnection logic
- Server-Sent Events: One-way only, insufficient for bidirectional scoring
- GraphQL Subscriptions: Overkill for this use case

### 2. Database ORM

**Decision**: Sequelize with PostgreSQL

**Rationale**:
- Mature ORM with TypeScript support
- Strong association/relationship handling
- JSONB support for flexible tournament settings
- UUID primary keys for distributed systems

**Alternatives Considered**:
- Prisma: Newer but less mature for complex relationships
- TypeORM: Less community support
- Raw SQL: More control but slower development

### 3. Authentication

**Decision**: JWT with role-based middleware

**Rationale**:
- Stateless authentication for WebSocket connections
- Role embedded in token for fast authorization
- Standard industry practice
- Easy to revoke via token expiration

**Alternatives Considered**:
- Session-based: Requires shared state across connections
- OAuth2: Overkill for internal tournament system
- API keys: Less secure for user-specific actions

### 4. Bracket Generation Algorithm

**Decision**: Weighted graph matching with club avoidance

**Rationale**:
- Model players as nodes, potential matches as edges
- Weight edges by: same club (penalty), rest period violation (penalty)
- Use greedy matching with backtracking for club avoidance
- Tertiary relaxation when >50% same club

**Alternatives Considered**:
- Random pairing: Doesn't satisfy club avoidance rules
- Brute force: Too slow for 64 players
- Pre-built brackets: Not flexible for different weight classes

### 5. State Machine Implementation

**Decision**: Finite state machine with guard conditions

**Rationale**:
- Explicit state transitions (SCHEDULED → IN_PROGRESS → PAUSED → FINISHED)
- Guard conditions prevent invalid transitions
- Event sourcing via MatchEvent for audit trail
- Easy to query current state

**Alternatives Considered**:
- Flag-based state: Error-prone, no transition validation
- State stored in Redis: Adds complexity for single-server deployment
- Database polling: Inefficient for real-time updates

### 6. Player Photo Storage

**Decision**: External service (Cloudinary) with URL reference

**Rationale**:
- No file storage on application server
- CDN for fast image delivery
- Image transformation API for thumbnails
- Free tier sufficient for tournament use

**Alternatives Considered**:
- Local file storage: Server scaling issues
- AWS S3: More complex setup
- Base64 in database: Bloats database, slow queries

### 7. Scoring Validation

**Decision**: Backend-only validation with event sourcing

**Rationale**:
- Single source of truth prevents cheating
- All scoring events logged for dispute resolution
- Point gap auto-end enforced server-side
- Clients receive validated state only

**Alternatives Considered**:
- Client-side validation: Can be bypassed
- Shared validation: Race conditions possible
- Optimistic locking: Too complex for real-time

### 8. Rest Period Calculation

**Decision**: Database query with time window

**Rationale**:
- Query player's last match end time
- Calculate required rest period from tournament settings
- Compare with proposed match start time
- Return violation if within rest window

**Alternatives Considered**:
- Redis cache: Adds complexity, eventual consistency
- In-memory tracking: Lost on server restart
- Pre-calculated schedule: Not flexible for dynamic scheduling

## Best Practices Identified

### WebSocket Architecture
- Use rooms for match isolation
- Emit state on client join for sync
- Queue messages during disconnection
- Validate all client actions server-side

### Matchmaking Algorithm
1. Group players by weight class and gender
2. Calculate club representation percentages
3. If any club >50%, relax club avoidance for bracket
4. Otherwise, apply greedy matching with club penalty
5. Check rest period compliance for all matches
6. Flag unavoidable intra-club matches with warning

### Error Handling
- Return structured error responses
- Log all validation failures
- Never expose internal errors to clients
- Use error codes for client-side handling

## Open Questions Resolved

1. **WebSocket library**: Socket.io chosen for built-in features
2. **Database**: PostgreSQL for JSONB and UUID support
3. **Auth**: JWT with role in token payload
4. **State management**: Event sourcing via MatchEvent table
5. **Photo handling**: External service, URL stored in database
