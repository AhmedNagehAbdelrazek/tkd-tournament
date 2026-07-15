const { body, param } = require('express-validator');

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

const updateClubValidation = [
  param('id').isInt({ min: 1 }).withMessage('Club ID must be a positive integer'),
  body('name')
    .notEmpty()
    .withMessage('Club name is required')
    .isString()
    .withMessage('Club name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Club name must be between 2 and 100 characters'),
];

const deleteClubValidation = [
  param('id').isInt({ min: 1 }).withMessage('Club ID must be a positive integer'),
];

module.exports = { createClubValidation, updateClubValidation, deleteClubValidation };
