const { body, param } = require('express-validator');
const { ROLES } = require('../../config/constants');

const assignRoleValidation = [
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  body('role')
    .optional({ values: 'null' })
    .isIn(Object.values(ROLES))
    .withMessage(`role must be one of: ${Object.values(ROLES).join(', ')}`),
];

const userIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
];

module.exports = { assignRoleValidation, userIdValidation };