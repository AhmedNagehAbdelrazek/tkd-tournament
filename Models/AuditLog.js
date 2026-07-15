const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { AUDIT_ACTIONS } = require('../config/constants');

class AuditLog extends Model {}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'actor_id',
    },
    action: {
      type: DataTypes.ENUM(Object.values(AUDIT_ACTIONS)),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'entity_id',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'createdat',
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    underscored: true,
    timestamps: false,
  }
);

module.exports = AuditLog;
