const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { MATCH_STATUS, MATCH_TYPES } = require('../config/constants');

class Match extends Model {}

Match.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tournamentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tournament_id',
    },
    type: {
      type: DataTypes.ENUM(Object.values(MATCH_TYPES)),
      allowNull: false,
      defaultValue: MATCH_TYPES.SINGLE_ELIMINATION,
    },
    player1Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'player1_id',
    },
    player2Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'player2_id',
    },
    scheduledTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'scheduled_time',
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_time',
    },
    status: {
      type: DataTypes.ENUM(Object.values(MATCH_STATUS)),
      allowNull: false,
      defaultValue: MATCH_STATUS.SCHEDULED,
    },
    winnerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'winner_id',
    },
    currentRound: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'current_round',
    },
    intraClubWarning: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'intra_club_warning',
    },
    bracketRound: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'bracket_round',
    },
    weightClass: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'weight_class',
    },
    scorePlayer1: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'score_player1',
    },
    scorePlayer2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'score_player2',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'createdat',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updatedat',
    },
  },
  {
    sequelize,
    modelName: 'Match',
    tableName: 'matches',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Match;
