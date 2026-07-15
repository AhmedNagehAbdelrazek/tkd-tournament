const router = require('express').Router();
const c = require('../Controllers/authController');
const protect = require('../middlewares/protect');
const validate = require('../middlewares/validatorMiddleware');
const { body } = require('express-validator');

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

// ponytail: one login endpoint — role checks live in route guards, not here
router.post('/signup', c.signup);
router.post('/login', loginValidation, validate, c.login);
router.get('/me', protect, c.me);
router.patch('/me', protect, c.updateProfile);

module.exports = router;
