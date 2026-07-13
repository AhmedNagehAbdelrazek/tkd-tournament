# Database Schema Specification (Sequelize)

## 1. `User`
- `id`: UUID, Primary Key
- `name`: STRING
- `email`: STRING, Unique
- `passwordHash`: STRING
- `role`: ENUM('ADMIN', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER')

## 2. `Club`
- `id`: UUID, Primary Key
- `name`: STRING, Unique

## 3. `Tournament`
- `id`: UUID, Primary Key
- `name`: STRING
- `startDate`: DATE
- `endDate`: DATE
- `settings`: JSONB 
  - *Schema*: `{ "roundDurationSec": 120, "restBetweenRoundsSec": 60, "restBetweenMatchesMin": 15, "pointGapAutoEnd": 20, "weightClasses": [{"name": "10-15kg", "min": 10, "max": 15}] }`

## 4. `Player`
- `id`: UUID, Primary Key (This is the "Player ID" exit requirement)
- `name`: STRING
- `dob`: DATE (Full date stored; age/year calculated on read)
- `weight`: DECIMAL(5,2)
- `gender`: ENUM('MALE', 'FEMALE')
- `clubId`: UUID, ForeignKey -> Club
- `tournamentId`: UUID, ForeignKey -> Tournament
- `photoUrl`: STRING (Cloudinary URL)

## 5. `Match`
- `id`: UUID, Primary Key
- `tournamentId`: UUID, ForeignKey -> Tournament
- `type`: ENUM('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'FRIENDLY')
- `player1Id`: UUID, ForeignKey -> Player
- `player2Id`: UUID, ForeignKey -> Player
- `scheduledTime`: TIMESTAMP
- `endTime`: TIMESTAMP, Nullable
- `status`: ENUM('SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'CANCELLED')
- `winnerId`: UUID, ForeignKey -> Player, Nullable
- `currentRound`: INTEGER (Default: 1)
- `intraClubWarning`: BOOLEAN (Default: false)

## 6. `MatchEvent` (Audit Trail)
- `id`: UUID, Primary Key
- `matchId`: UUID, ForeignKey -> Match
- `type`: ENUM('START', 'PAUSE', 'RESUME', 'END_ROUND', 'ADD_POINT', 'REMOVE_POINT', 'AUTO_END_BY_GAP')
- `playerId`: UUID, ForeignKey -> Player, Nullable
- `points`: INTEGER, Nullable
- `roundNumber`: INTEGER
- `timestamp`: TIMESTAMP (Default: NOW)