// ponytail: minimal stubs — existing authController depends on these
const { body } = require('express-validator');

const signupValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
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
