# Quickstart: Taekwondo Match Management System

**Date**: 2026-07-13

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd tkd-tournament/backend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tkd_tournament

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=development

# WebSocket
WS_CORS_ORIGIN=http://localhost:3001
```

### 3. Database Setup

```bash
# Create database
npx sequelize db:create

# Run migrations
npx sequelize db:migrate

# Seed initial admin user
npx sequelize db:seed:all
```

### 4. Start Development Server

```bash
# Start server with hot-reload
npm run dev

# Server runs at http://localhost:3000
# WebSocket available at ws://localhost:3000/live-matches
```

## API Testing

### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

### 2. Create Tournament

```bash
curl -X POST http://localhost:3000/api/tournaments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Championship 2026",
    "startDate": "2026-08-01",
    "endDate": "2026-08-03",
    "settings": {
      "roundDurationSec": 120,
      "restBetweenRoundsSec": 60,
      "restBetweenMatchesMin": 15,
      "pointGapAutoEnd": 20,
      "weightClasses": [
        {"name": "10-15kg", "min": 10, "max": 15},
        {"name": "15-20kg", "min": 15, "max": 20}
      ]
    }
  }'
```

### 3. Register Player

```bash
curl -X POST http://localhost:3000/api/players \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "tournament-uuid",
    "name": "John Doe",
    "dob": "2010-05-15",
    "weight": 45.5,
    "gender": "MALE",
    "clubId": "club-uuid"
  }'
```

### 4. Generate Bracket

```bash
curl -X POST http://localhost:3000/api/matches/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "tournament-uuid",
    "weightClass": "10-15kg",
    "gender": "MALE",
    "matchType": "SINGLE_ELIMINATION"
  }'
```

### 5. Start Match

```bash
curl -X POST http://localhost:3000/api/matches/<match-id>/start \
  -H "Authorization: Bearer <token>"
```

## WebSocket Testing

### Connect with Socket.io Client

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/live-matches', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected to live matches');
  
  // Join a match room
  socket.emit('join_match', { matchId: 'match-uuid' });
});

// Listen for score updates
socket.on('MATCH:SCORE_UPDATE', (data) => {
  console.log('Score update:', data);
});

// Listen for state updates
socket.on('MATCH:STATE_UPDATE', (data) => {
  console.log('Full state:', data);
});

// Add a point
socket.emit('MATCH:ADD_POINT', {
  matchId: 'match-uuid',
  playerId: 'player-uuid',
  points: 3,
  roundNumber: 1
});
```

## Project Structure

```text
backend/
├── src/
│   ├── config/          # Database, socket, auth config
│   ├── models/          # Sequelize models
│   ├── services/        # Business logic
│   ├── middleware/       # Auth, RBAC, validation
│   ├── routes/          # Express routes
│   ├── socket/          # WebSocket handlers
│   ├── utils/           # Helper functions
│   └── app.ts           # Entry point
├── tests/               # Test files
├── package.json
├── tsconfig.json
└── .env.example
```

## Development Workflow

1. **Start with models**: Create User, Club, Tournament, Player, Match, MatchEvent
2. **Add authentication**: JWT login + role-based middleware
3. **Implement CRUD**: Tournament and Player management
4. **Build matchmaking**: Bracket generation with club avoidance
5. **Add WebSocket**: Real-time scoring and state sync
6. **Write tests**: Unit tests for algorithms, integration tests for APIs

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Common Issues

### Database Connection

**Issue**: `Connection refused` error

**Solution**: Ensure PostgreSQL is running and `DATABASE_URL` is correct

### WebSocket Authentication

**Issue**: `Authentication error` on connect

**Solution**: Ensure JWT token is valid and not expired

### Scoring Validation

**Issue**: `Match not in progress` error

**Solution**: Ensure match status is `IN_PROGRESS` before scoring

### Port Already in Use

**Issue**: `EADDRINUSE` error

**Solution**: Change `PORT` in `.env` or stop other process using port 3000
