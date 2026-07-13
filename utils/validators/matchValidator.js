const { body } = require('express-validator');

const generateMatchValidation = [
  body('tournamentId')
    .notEmpty()
    .withMessage('tournamentId is required')
    .isInt({ min: 1 })
    .withMessage('tournamentId must be a positive integer'),
  body('gender')
    .notEmpty()
    .withMessage('gender is required')
    .isIn(['MALE', 'FEMALE'])
    .withMessage('gender must be MALE or FEMALE'),
  body('weightClass')
    .notEmpty()
    .withMessage('weightClass is required')
    .isString()
    .withMessage('weightClass must be a string'),
];

const endMatchValidation = [
  body('winnerId')
    .notEmpty()
    .withMessage('winnerId is required')
    .isInt({ min: 1 })
    .withMessage('winnerId must be a positive integer'),
];

const addPointValidation = [
  body('playerId')
    .notEmpty()
    .withMessage('playerId is required')
    .isInt({ min: 1 })
    .withMessage('playerId must be a positive integer'),
  body('points')
    .notEmpty()
    .withMessage('points is required')
    .isInt({ min: 1 })
    .withMessage('points must be a positive integer'),
  body('roundNumber')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage('roundNumber must be between 1 and 3'),
];

const removePointValidation = [
  body('playerId')
    .notEmpty()
    .withMessage('playerId is required')
    .isInt({ min: 1 })
    .withMessage('playerId must be a positive integer'),
  body('points')
    .notEmpty()
    .withMessage('points is required')
    .isInt({ min: 1 })
    .withMessage('points must be a positive integer'),
  body('roundNumber')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage('roundNumber must be between 1 and 3'),
];

const endRoundValidation = [
  body('roundNumber')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage('roundNumber must be between 1 and 3'),
];

module.exports = {
  generateMatchValidation,
  endMatchValidation,
  addPointValidation,
  removePointValidation,
  endRoundValidation,
};
