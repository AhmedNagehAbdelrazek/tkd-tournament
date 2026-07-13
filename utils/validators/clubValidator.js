const { body } = require('express-validator');

const createClubValidation = [
  body('name')
    .notEmpty()
    .withMessage('Club name is required')
    .isString()
    .withMessage('Club name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Club name must be between 2 and 100 characters'),
];

module.exports = { createClubValidation };
