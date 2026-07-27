const { body } = require('express-validator');

const signupValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('fullName').optional().isString().withMessage('fullName must be a string'),
  body('name').optional().isString().withMessage('name must be a string'),
  body('role').optional().isString().withMessage('role must be a string'),
];
const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];
const updateProfileValidation = [
  body('name').optional().isString(),
  body('email').optional().isEmail(),
];

module.exports = { signupValidation, loginValidation, updateProfileValidation };
