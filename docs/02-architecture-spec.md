# Architecture Specification

## 1. Tech Stack
- **Runtime**: Node.js (v18+)
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Real-time Communication**: Socket.io (Mandatory for Live Match module)
- **Authentication**: JWT (JSON Web Tokens) with role-based middleware
- **File Storage**: Cloudinary (Frontend uploads directly or via backend presigned URL; backend stores only the `photoUrl` string).

## 2. System Architecture Principles
- **Single Source of Truth (SSOT)**: The backend database is the absolute source of truth for match state, scores, and timers. Clients must sync from the backend on reconnection.
- **State Machine**: Matches follow a strict state machine: `SCHEDULED` → `IN_PROGRESS` → `PAUSED` ↔ `IN_PROGRESS` → `FINISHED` | `CANCELLED`.
- **Event-Driven Validation**: All scoring actions (`ADD_POINT`, `REMOVE_POINT`) are validated by the backend *before* updating the state and broadcasting to clients.

## 3. Real-time Architecture (Socket.io)
- **Namespace**: `/live-matches`
- **Rooms**: Each match has its own room (e.g., `match_<matchId>`). Judges and scorekeepers join this room to receive real-time updates.
- **State Sync**: On client connection to a match room, the server immediately emits the current `MATCH:STATE_UPDATE` payload to ensure the client is synchronized.