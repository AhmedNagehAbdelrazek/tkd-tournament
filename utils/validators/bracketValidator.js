const { body, query } = require('express-validator');

const getBracketValidation = [
  query('weightClass').notEmpty().withMessage('weightClass is required'),
  query('gender').isIn(['MALE', 'FEMALE']).withMessage('gender must be MALE or FEMALE'),
];

const overrideValidation = [
  body('matchId').isInt().withMessage('matchId must be an integer'),
  body('playerId').isInt().withMessage('playerId must be an integer'),
];

module.exports = { getBracketValidation, overrideValidation };
