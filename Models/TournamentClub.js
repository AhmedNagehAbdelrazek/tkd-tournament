const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ponytail: join table — just two IDs, nothing else
class TournamentClub extends Model {}

TournamentClub.init(
  {
    tournamentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tournament_id',
      primaryKey: true,
    },
    clubId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'club_id',
      primaryKey: true,
    },
  },
  {
    sequelize,
    modelName: 'TournamentClub',
    tableName: 'tournament_clubs',
    underscored: true,
    timestamps: false,
  }
);

module.exports = TournamentClub;
