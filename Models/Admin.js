// ponytail: minimal Admin model — needed by protect middleware
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Admin extends Model {}

Admin.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  },
  {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    underscored: true,
    timestamps: false,
  }
);

module.exports = Admin;
