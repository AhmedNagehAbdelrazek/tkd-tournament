const { body, param } = require('express-validator');
const { MATCH_TYPES } = require('../../config/constants');

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

const scheduleMatchValidation = [
  body('tournamentId')
    .notEmpty()
    .withMessage('tournamentId is required')
    .isInt({ min: 1 })
    .withMessage('tournamentId must be a positive integer'),
  body('player1Id')
    .notEmpty()
    .withMessage('player1Id is required')
    .isInt({ min: 1 })
    .withMessage('player1Id must be a positive integer'),
  body('player2Id')
    .notEmpty()
    .withMessage('player2Id is required')
    .isInt({ min: 1 })
    .withMessage('player2Id must be a positive integer'),
  body('scheduledTime')
    .notEmpty()
    .withMessage('scheduledTime is required')
    .isISO8601()
    .withMessage('scheduledTime must be a valid ISO 8601 date'),
  body('type')
    .optional()
    .isIn(Object.values(MATCH_TYPES))
    .withMessage(`type must be one of: ${Object.values(MATCH_TYPES).join(', ')}`),
  body('weightClass')
    .optional()
    .isString()
    .withMessage('weightClass must be a string'),
];

const rescheduleMatchValidation = [
  param('id').isInt({ min: 1 }).withMessage('Match ID must be a positive integer'),
  body('scheduledTime')
    .notEmpty()
    .withMessage('scheduledTime is required')
    .isISO8601()
    .withMessage('scheduledTime must be a valid ISO 8601 date'),
];

const walkoverValidation = [
  param('id').isInt({ min: 1 }).withMessage('Match ID must be a positive integer'),
  body('winnerId')
    .notEmpty()
    .withMessage('winnerId is required')
    .isInt({ min: 1 })
    .withMessage('winnerId must be a positive integer'),
];

module.exports = {
  generateMatchValidation,
  endMatchValidation,
  addPointValidation,
  removePointValidation,
  endRoundValidation,
  scheduleMatchValidation,
  rescheduleMatchValidation,
  walkoverValidation,
};
