const { body } = require('express-validator');

const createTournamentValidation = [
  body('name')
    .notEmpty()
    .withMessage('Tournament name is required')
    .isString()
    .withMessage('Tournament name must be a string'),
  body('startDate')
    .notEmpty()
    .withMessage('startDate is required')
    .isISO8601()
    .withMessage('startDate must be a valid date'),
  body('endDate')
    .notEmpty()
    .withMessage('endDate is required')
    .isISO8601()
    .withMessage('endDate must be a valid date'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('settings must be an object'),
  body('settings.weightClasses')
    .optional()
    .isArray()
    .withMessage('weightClasses must be an array'),
  body('settings.weightClasses.*.name')
    .optional()
    .isString()
    .withMessage('weight class name must be a string'),
  body('settings.weightClasses.*.min')
    .optional()
    .isNumeric()
    .withMessage('weight class min must be a number'),
  body('settings.weightClasses.*.max')
    .optional()
    .isNumeric()
    .withMessage('weight class max must be a number'),
  body('settings.pointGapAutoEnd')
    .optional()
    .isInt({ min: 1 })
    .withMessage('pointGapAutoEnd must be a positive integer'),
  body('settings.restBetweenMatchesMin')
    .optional()
    .isInt({ min: 0 })
    .withMessage('restBetweenMatchesMin must be a non-negative integer'),
  body('settings.roundDurationSec')
    .optional()
    .isInt({ min: 30 })
    .withMessage('roundDurationSec must be at least 30'),
  body('settings.restBetweenRoundsSec')
    .optional()
    .isInt({ min: 0 })
    .withMessage('restBetweenRoundsSec must be a non-negative integer'),
];

module.exports = { createTournamentValidation };
