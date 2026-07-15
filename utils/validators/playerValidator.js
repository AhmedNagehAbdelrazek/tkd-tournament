const { body, param } = require('express-validator');

const createPlayerValidation = [
  body('name')
    .notEmpty()
    .withMessage('Player name is required')
    .isString()
    .withMessage('Player name must be a string'),
  body('dob')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('dob must be a valid date'),
  body('weight')
    .notEmpty()
    .withMessage('Weight is required')
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['MALE', 'FEMALE'])
    .withMessage('Gender must be MALE or FEMALE'),
  body('clubId')
    .notEmpty()
    .withMessage('clubId is required')
    .isInt({ min: 1 })
    .withMessage('clubId must be a positive integer'),
  body('tournamentId')
    .notEmpty()
    .withMessage('tournamentId is required')
    .isInt({ min: 1 })
    .withMessage('tournamentId must be a positive integer'),
  body('photoUrl')
    .optional()
    .isURL()
    .withMessage('photoUrl must be a valid URL'),
];

const bulkCreatePlayerValidation = [
  body('tournamentId')
    .notEmpty()
    .withMessage('tournamentId is required')
    .isInt({ min: 1 })
    .withMessage('tournamentId must be a positive integer'),
  body('players')
    .notEmpty()
    .withMessage('players array is required')
    .isArray({ min: 1 })
    .withMessage('players must be a non-empty array'),
  body('players.*.name')
    .notEmpty()
    .withMessage('Player name is required'),
  body('players.*.dob')
    .notEmpty()
    .withMessage('Player dob is required')
    .isISO8601()
    .withMessage('dob must be a valid date'),
  body('players.*.weight')
    .notEmpty()
    .withMessage('Player weight is required')
    .isFloat({ min: 0 })
    .withMessage('weight must be a positive number'),
  body('players.*.gender')
    .notEmpty()
    .withMessage('Player gender is required')
    .isIn(['MALE', 'FEMALE'])
    .withMessage('gender must be MALE or FEMALE'),
  body('players.*.clubId')
    .notEmpty()
    .withMessage('Player clubId is required')
    .isInt({ min: 1 })
    .withMessage('clubId must be a positive integer'),
];

const updatePlayerValidation = [
  param('id').isInt({ min: 1 }).withMessage('Player ID must be a positive integer'),
  body('name').optional().isString().withMessage('name must be a string'),
  body('dob').optional().isISO8601().withMessage('dob must be a valid date'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('weight must be a positive number'),
  body('gender').optional().isIn(['MALE', 'FEMALE']).withMessage('gender must be MALE or FEMALE'),
  body('clubId').optional().isInt({ min: 1 }).withMessage('clubId must be a positive integer'),
  body('seed').optional().isInt({ min: 1 }).withMessage('seed must be a positive integer'),
  body('photoUrl').optional().isURL().withMessage('photoUrl must be a valid URL'),
];

const deletePlayerValidation = [
  param('id').isInt({ min: 1 }).withMessage('Player ID must be a positive integer'),
];

module.exports = { createPlayerValidation, bulkCreatePlayerValidation, updatePlayerValidation, deletePlayerValidation };
