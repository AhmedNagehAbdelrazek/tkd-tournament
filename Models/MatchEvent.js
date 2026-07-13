const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { MATCH_EVENT_TYPES } = require('../config/constants');

class MatchEvent extends Model {}

MatchEvent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    matchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'match_id',
    },
    type: {
      type: DataTypes.ENUM(Object.values(MATCH_EVENT_TYPES)),
      allowNull: false,
    },
    playerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'player_id',
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    roundNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'round_number',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'createdat',
    },
  },
  {
    sequelize,
    modelName: 'MatchEvent',
    tableName: 'match_events',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = MatchEvent;
