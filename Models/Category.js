const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Category extends Model {}

Category.init(
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
    tournamentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tournament_id',
    },
    bracketDepth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      field: 'bracket_depth',
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE'),
      allowNull: false,
    },
    minWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'min_weight',
    },
    maxWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'max_weight',
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
    modelName: 'Category',
    tableName: 'categories',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Category;
