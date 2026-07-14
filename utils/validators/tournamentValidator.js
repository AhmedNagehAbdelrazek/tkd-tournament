const { body } = require('express-validator');

const weightClassValidation = (prefix) => [
  body(`${prefix}.name`)
    .notEmpty()
    .withMessage('weight class name is required')
    .isString()
    .withMessage('weight class name must be a string'),
  body(`${prefix}.min`)
    .notEmpty()
    .withMessage('weight class min is required')
    .isFloat({ min: 0 })
    .withMessage('weight class min must be a non-negative number'),
  body(`${prefix}.max`)
    .notEmpty()
    .withMessage('weight class max is required')
    .isFloat({ min: 0 })
    .withMessage('weight class max must be a non-negative number'),
];

const genderKeyedWeightClassValidation = [
  body('settings.weightClasses')
    .optional()
    .isObject()
    .withMessage('weightClasses must be an object with MALE and/or FEMALE keys'),
  body('settings.weightClasses.MALE')
    .optional()
    .isArray()
    .withMessage('MALE weight classes must be an array'),
  ...weightClassValidation('settings.weightClasses.MALE.*'),
  body('settings.weightClasses.FEMALE')
    .optional()
    .isArray()
    .withMessage('FEMALE weight classes must be an array'),
  ...weightClassValidation('settings.weightClasses.FEMALE.*'),
];

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
  ...genderKeyedWeightClassValidation,
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

const updateSettingsValidation = [
  body('weightClasses')
    .notEmpty()
    .withMessage('weightClasses is required')
    .isObject()
    .withMessage('weightClasses must be an object with MALE and/or FEMALE keys'),
  body('weightClasses.MALE')
    .optional()
    .isArray()
    .withMessage('MALE weight classes must be an array'),
  ...weightClassValidation('weightClasses.MALE.*'),
  body('weightClasses.FEMALE')
    .optional()
    .isArray()
    .withMessage('FEMALE weight classes must be an array'),
  ...weightClassValidation('weightClasses.FEMALE.*'),
];

module.exports = { createTournamentValidation, updateSettingsValidation };
