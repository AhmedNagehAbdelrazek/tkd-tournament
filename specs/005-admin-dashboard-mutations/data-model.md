# Data Model: Admin Dashboard Mutations

## New Entity: AuditLog

### Table: `audit_logs`

| Field       | Type                         | Constraints                          | Description                                              |
| ----------- | ---------------------------- | ------------------------------------ | -------------------------------------------------------- |
| id          | INTEGER                      | PK, auto-increment                   | Unique identifier                                        |
| actorId     | INTEGER                      | NOT NULL, FK → users.id              | The user who performed the action                        |
| action      | ENUM                         | NOT NULL                             | Type of action (see values below)                        |
| entityType  | STRING                       | NOT NULL                             | Target entity type: 'player', 'club', 'tournament', 'user' |
| entityId    | INTEGER                      | NOT NULL                             | ID of the affected entity                                |
| metadata    | JSONB                        | NULLABLE                             | Action-specific details (changed fields, old/new values) |
| createdAt   | DATE                         | NOT NULL, DEFAULT NOW                | Timestamp of the action (no updatedAt — immutable)      |

**Action enum values**: `CREATE`, `UPDATE`, `DELETE`, `ASSIGN_ROLE`, `REVOKE_ROLE`, `DEACTIVATE`, `REACTIVATE`, `MARK_COMPLETE`, `SCHEDULE_MATCH`, `RESCHEDULE_MATCH`, `CANCEL_MATCH`, `WALKOVER`

### Sequelize Model

```js
// Models/AuditLog.js
class AuditLog extends Model {}

AuditLog.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  actorId: { type: DataTypes.INTEGER, allowNull: false, field: 'actor_id' },
  action: { type: DataTypes.ENUM('CREATE','UPDATE','DELETE','ASSIGN_ROLE','REVOKE_ROLE','DEACTIVATE','REACTIVATE','MARK_COMPLETE','SCHEDULE_MATCH','RESCHEDULE_MATCH','CANCEL_MATCH','WALKOVER'), allowNull: false },
  entityType: { type: DataTypes.STRING, allowNull: false, field: 'entity_type' },
  entityId: { type: DataTypes.INTEGER, allowNull: false, field: 'entity_id' },
  metadata: { type: DataTypes.JSONB, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'createdat' },
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  underscored: true,
  timestamps: false,
});
```

### Associations

```js
// Models/index.js additions
User.hasMany(AuditLog, { foreignKey: 'actor_id' });
AuditLog.belongsTo(User, { as: 'actor', foreignKey: 'actor_id' });
```

### Metadata JSONB Shapes

**CREATE** (player, club, tournament):
```json
{ "name": "Player Name", "tournamentId": 1 }
```

**UPDATE** (player):
```json
{ "changedFields": ["weight", "clubId"], "previousValues": { "weight": 65.0, "clubId": 3 }, "newValues": { "weight": 68.5, "clubId": 5 } }
```

**DELETE** (player, club, tournament):
```json
{ "name": "Deleted Entity Name" }
```

**ASSIGN_ROLE / REVOKE_ROLE** (user):
```json
{ "role": "MAT_JUDGE", "targetUserId": 42 }
```

**DEACTIVATE / REACTIVATE** (user):
```json
{ "targetUserId": 42, "email": "user@example.com" }
```

**MARK_COMPLETE** (tournament):
```json
{ "tournamentName": "Spring Open 2026", "matchCount": 48 }
```

**SCHEDULE_MATCH / RESCHEDULE_MATCH / CANCEL_MATCH / WALKOVER** (match):
```json
{ "player1Id": 10, "player2Id": 15, "scheduledTime": "2026-07-20T10:00:00Z" }
```

## Existing Entity Modifications

### No Schema Changes

The following entities are NOT modified by this feature:
- Player — no new fields
- Club — no new fields
- Tournament — no new fields
- Match — no new fields
- MatchEvent — no new fields
- User — no new fields

### Association Additions

Only AuditLog associations are added (see above). All existing associations remain unchanged.

## Migration

A single migration creates the `audit_logs` table:

```sql
CREATE TYPE enum_audit_logs_action AS ENUM (
  'CREATE','UPDATE','DELETE','ASSIGN_ROLE','REVOKE_ROLE',
  'DEACTIVATE','REACTIVATE','MARK_COMPLETE','SCHEDULE_MATCH',
  'RESCHEDULE_MATCH','CANCEL_MATCH','WALKOVER'
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  action enum_audit_logs_action NOT NULL,
  entity_type VARCHAR(255) NOT NULL,
  entity_id INTEGER NOT NULL,
  metadata JSONB,
  createdat TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_createdat ON audit_logs(createdat);
```
