const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Club extends Model {}

Club.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
    modelName: 'Club',
    tableName: 'clubs',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Club;
