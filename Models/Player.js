const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Player extends Model {}

Player.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nationalId: {
      type: DataTypes.STRING(14),
      allowNull: true,
      field: 'national_id',
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    seed: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE'),
      allowNull: false,
    },
    clubId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'club_id',
    },
    tournamentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'tournament_id',
    },
    photoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'photo_url',
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'image_url',
    },
    birthCertificateUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'birth_certificate_url',
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
    modelName: 'Player',
    tableName: 'players',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Player;
