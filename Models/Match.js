const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { MATCH_TYPES } = require('../config/constants');

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
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'category_id',
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
      type: DataTypes.ENUM('SCHEDULED', 'PRE_MATCH', 'IN_PROGRESS', 'PAUSED', 'ROUND_END', 'FINISHED', 'MATCH_END', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'SCHEDULED',
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
    totalRounds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      field: 'total_rounds',
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
    nextMatchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'next_match_id',
    },
    nextMatchSlot: {
      type: DataTypes.ENUM('PLAYER1', 'PLAYER2'),
      allowNull: true,
      field: 'next_match_slot',
    },
    stageName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Round 1',
      field: 'stage_name',
    },
    bracketPosition: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'bracket_position',
    },
    endReason: {
      type: DataTypes.ENUM(
        'TIME_EXPIRED', 'POINT_GAP', 'WALKOVER', 'INJURY_WITHDRAWAL',
        'DISQUALIFICATION', 'REFEREE_STOPPAGE', 'GOLDEN_POINT', 'BYE'
      ),
      allowNull: true,
      field: 'end_reason',
    },
    hongScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'hong_score',
    },
    chungScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chung_score',
    },
    hongPenalties: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'hong_penalties',
    },
    chungPenalties: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chung_penalties',
    },
    hongInjured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'hong_injured',
    },
    chungInjured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'chung_injured',
    },
    hongExcluded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'hong_excluded',
    },
    chungExcluded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'chung_excluded',
    },
    timerStartTime: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'timer_start_time',
    },
    accumulatedPausedTime: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      field: 'accumulated_paused_time',
    },
    roundDurationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 120,
      field: 'round_duration_seconds',
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
