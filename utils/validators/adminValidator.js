const { body, param } = require('express-validator');

const TKD_ROLES = ['ADMIN', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER'];

const assignRoleValidation = [
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  body('tkdRole')
    .optional({ values: 'null' })
    .isIn(TKD_ROLES)
    .withMessage(`tkdRole must be one of: ${TKD_ROLES.join(', ')}`),
];

const userIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
];

module.exports = { assignRoleValidation, userIdValidation };
