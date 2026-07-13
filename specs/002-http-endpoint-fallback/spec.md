# Specification: HTTP Endpoint Fallback for WebSocket Failure

## Clarifications

### Session 2026-07-13

- Q: What operations are included in HTTP fallback scope? → A: Match operations only — scoring, match control (start/pause/end), state retrieval. Admin setup (tournament config, player registration) excluded.
- Q: How do clients detect WebSocket failure and switch to HTTP? → A: Client-initiated timeout — client attempts WebSocket, times out after configurable period, then switches to HTTP polling automatically.
- Q: What polling mechanism is used? → A: Standard polling — client polls at fixed interval (default 1s). Simple, predictable, easy to debug.
- Q: What data format is returned in poll responses? → A: Full state — each poll returns complete match state (scores, timer, round, status).
- Q: How does the system handle excessive HTTP requests? → A: Per-client rate limit (e.g., 2/sec). Return 429 with Retry-After header when exceeded.

## Overview
Provide HTTP REST API endpoints as a fallback mechanism when users cannot establish or maintain WebSocket connections to the tournament system. This ensures all tournament operations remain accessible even when real-time communication is unavailable, allowing clients to poll for state updates and submit actions via standard HTTP requests.

## User Scenarios & Testing

### Primary User Scenarios

1. **WebSocket Connection Failure**: A judge's device cannot establish a WebSocket connection due to network restrictions (firewall, proxy). The system automatically falls back to HTTP polling to retrieve match state and submit scoring actions.

2. **Intermittent Connectivity**: A scorekeeper experiences intermittent WebSocket drops. The system transparently switches between WebSocket and HTTP polling based on connection availability.

3. **Manual Fallback**: An admin deliberately uses HTTP endpoints on a restricted network where WebSocket is not supported.

### Acceptance Scenarios

1. **Given** a client cannot establish a WebSocket connection, **When** the client attempts to connect and times out, **Then** the client automatically switches to HTTP polling for match operations (scoring, match control, state retrieval).

2. **Given** a client is connected via HTTP polling, **When** match state changes, **Then** the next poll returns the full updated state within acceptable latency (≤2 seconds).

3. **Given** a client submits a scoring action via HTTP, **When** the backend validates the action, **Then** the response includes confirmation and the complete updated match state.

4. **Given** multiple clients poll simultaneously, **When** state changes occur, **Then** all polling clients receive consistent full state in their next poll.

5. **Given** a client polls faster than the rate limit, **When** the limit is exceeded, **Then** the system returns HTTP 429 with a Retry-After header.

### Edge Cases

1. **Simultaneous WebSocket and HTTP**: Client maintains both connections - system ensures state consistency regardless of which channel updates arrive.

2. **Polling Storm**: Many clients polling at high frequency - system enforces per-client rate limiting and returns 429 with Retry-After when exceeded.

3. **Action Conflicts**: HTTP and WebSocket actions arrive nearly simultaneously - system serializes all actions through backend validation.

4. **Rate Limit Recovery**: Client receives 429 response - client waits for Retry-After duration before resuming polling.

## Requirements

### Functional Requirements

1. **FR-01**: System shall expose HTTP GET endpoints for retrieving current match state (scores, timer, round, status) — full state returned on each request.

2. **FR-02**: System shall expose HTTP POST endpoints for submitting scoring actions, match control commands (start, pause, resume, end), and match cancellation.

3. **FR-03**: System shall expose HTTP GET endpoints for retrieving tournament state (brackets, schedules, player lists).

4. **FR-04**: System shall support standard polling with configurable interval (default 1 second) for state updates.

5. **FR-05**: System shall return appropriate HTTP status codes and error messages for all endpoint responses.

6. **FR-06**: System shall maintain state consistency between WebSocket and HTTP channels - actions via either channel update the same authoritative state.

7. **FR-07**: System shall apply the same authentication and authorization rules to HTTP endpoints as WebSocket connections.

8. **FR-08**: System shall document all HTTP endpoints for client implementation.

9. **FR-09**: System shall enforce per-client HTTP rate limiting (default 2 requests/second) and return HTTP 429 with Retry-After header when exceeded.

### Non-functional Requirements

1. **NFR-01**: HTTP endpoint responses shall complete within 500ms for scoring operations.

2. **NFR-02**: System shall support at least 100 concurrent HTTP polling clients per match.

3. **NFR-03**: HTTP fallback shall be available for all roles (Admin, Head Judge, Mat Judge, Scorekeeper) for match operations.

4. **NFR-04**: System shall handle HTTP and WebSocket connections without state divergence.

## Success Criteria

1. **Fallback Accessibility**: Clients unable to connect via WebSocket can complete all essential match operations (scoring, match control, state retrieval) via HTTP endpoints.

2. **State Consistency**: Actions submitted via HTTP produce identical state changes as equivalent WebSocket actions.

3. **Update Latency**: Clients receive full state updates within 2 seconds via HTTP polling (vs 500ms for WebSocket).

4. **Load Handling**: System maintains performance with up to 100 concurrent HTTP polling clients per match.

5. **No Feature Parity Gap**: All match operations available via WebSocket are also available via HTTP endpoints. Admin setup operations (tournament config, player registration) remain WebSocket-only.

## Key Entities

- **HTTP Endpoint**: REST API interface for match operations
- **Polling Client**: Client using HTTP polling for state updates, switched from WebSocket after connection timeout
- **Connection Channel**: Communication path (WebSocket or HTTP) used by a client

## Assumptions

1. **Scope Boundary**: HTTP fallback covers match operations only (scoring, match control, state retrieval). Admin-only operations (tournament setup, player registration) remain WebSocket-only as they are performed on stable networks before matches.

2. **Polling Interval**: Default polling interval is 1 second; configurable per client based on role and needs.

3. **Rate Limit**: Default per-client rate limit is 2 requests/second; configurable per deployment.

4. **Existing Auth**: HTTP endpoints use the same authentication mechanism as WebSocket connections (token-based).

5. **No Offline Mode**: HTTP fallback requires active network connection; it does not provide offline operation.

## Dependencies

1. **Existing API Infrastructure**: Leverages existing backend API structure and authentication.

2. **WebSocket Implementation**: Builds upon existing WebSocket implementation for state management.

3. **Client Libraries**: Client applications must implement WebSocket timeout detection and HTTP polling fallback logic.
