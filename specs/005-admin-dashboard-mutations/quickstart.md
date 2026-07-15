# Quickstart: Admin Dashboard Mutations

## Prerequisites

- Node.js 18+
- PostgreSQL running locally or accessible via `DATABASE_URL`
- Dependencies installed (`npm install`)

## Database Setup

Run the migration to create the `audit_logs` table:

```bash
npx sequelize-cli db:migrate
```

Or manually run the SQL from `data-model.md` against your database.

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npx jest tests/unit/

# Integration tests only
npx jest tests/integration/

# Contract tests only
npx jest tests/contract/

# Specific feature tests
npx jest tests/ --testPathPattern="admin|player-crud|club-crud|tournament-crud|match-scheduling|dashboard"
```

## Key Files to Create/Modify

### New Files
| File                              | Purpose                                  |
| --------------------------------- | ---------------------------------------- |
| `Models/AuditLog.js`                | AuditLog Sequelize model                 |
| `Services/adminService.js`          | User admin business logic                |
| `Controllers/adminController.js`    | User admin + dashboard controller        |
| `Routes/adminRoutes.js`             | User admin + dashboard routes            |
| `utils/validators/adminValidator.js` | User admin input validation              |

### Modified Files
| File                              | Changes                                  |
| --------------------------------- | ---------------------------------------- |
| `Models/index.js`                   | Add AuditLog associations                |
| `Routes/index.js`                   | Mount adminRoutes                        |
| `Services/auditService.js`          | Replace stub with real AuditLog writes   |
| `Services/playerService.js`         | Add getById, update, delete, list (paginated) |
| `Controllers/playerController.js`   | Add getById, update, delete, list        |
| `Routes/playerRoutes.js`            | Add GET /:id, PUT /:id, DELETE /:id      |
| `Services/clubService.js`           | Add update, delete, getById, list (paginated) |
| `Controllers/clubController.js`     | Add update, delete, getById, list        |
| `Routes/clubRoutes.js`              | Add GET /:id, PUT /:id, DELETE /:id      |
| `Services/tournamentService.js`     | Add update, markComplete, delete, getById with stats, list (paginated) |
| `Controllers/tournamentController.js` | Add update, markComplete, delete, getById, list |
| `Routes/tournamentRoutes.js`        | Add PUT /:id, DELETE /:id, POST /:id/complete; extract adminGuard |
| `Services/matchService.js`          | Add list (paginated), schedule, reschedule, walkover |
| `Controllers/matchController.js`    | Add list, schedule, reschedule, walkover |
| `Routes/matchRoutes.js`             | Add GET /, POST /schedule, PUT /:id/reschedule, POST /:id/walkover |
| `utils/validators/playerValidator.js` | Add updatePlayerValidation, deletePlayerValidation |
| `utils/validators/clubValidator.js`  | Add updateClubValidation, deleteClubValidation |
| `utils/validators/tournamentValidator.js` | Add updateTournamentValidation, markCompleteValidation, deleteTournamentValidation |
| `utils/validators/matchValidator.js` | Add scheduleMatchValidation, rescheduleMatchValidation, walkoverValidation |
| `middlewares/adminGuard.js` (new)   | Shared admin guard middleware             |
| `postman/collection.json`           | Add all new endpoints                    |

## Implementation Order

1. **AuditLog model + migration** — Foundation for all audit logging
2. **Admin guard extraction** — Shared middleware for entity CRUD auth
3. **Player CRUD** — GetById, update, delete, list with pagination
4. **Club CRUD** — GetById, update, delete, list with pagination
5. **Tournament CRUD** — Update, markComplete, delete, getById with stats, list with pagination
6. **Match scheduling** — List, schedule, reschedule, cancel, walkover
7. **User admin** — List users, assign/revoke TKD role, deactivate/reactivate
8. **Dashboard stats** — Tournament overview, tournament list with status
9. **Audit logging integration** — Wire auditService into all mutation services
10. **Postman collection update** — Add all new endpoints
11. **Tests** — Contract, integration, and unit tests for all new endpoints

## Manual Testing

```bash
# Start the server
node server.js

# Get an auth token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Test player update
curl -X PUT http://localhost:3000/api/players/1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"weight": 70.5}'

# Test paginated list
curl "http://localhost:3000/api/players?tournamentId=1&page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"

# Test tournament completion
curl -X POST http://localhost:3000/api/tournaments/1/complete \
  -H "Authorization: Bearer <TOKEN>"

# Test dashboard overview
curl http://localhost:3000/api/dashboard/tournaments/1/overview \
  -H "Authorization: Bearer <TOKEN>"
```
