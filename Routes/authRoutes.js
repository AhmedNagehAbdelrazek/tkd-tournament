const router = require('express').Router();
const c = require('../Controllers/authController');
const validate = require('../middlewares/validatorMiddleware');
const { body } = require('express-validator');

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

// --- IN DOC ---
router.post('/register', c.signup);
router.post('/login', loginValidation, validate, c.login);

// --- NOT IN DOC (commented out, maybe use later) ---
// router.post('/signup', c.signup);
// router.get('/me', protect, c.me);
// router.patch('/me', protect, c.updateProfile);

module.exports = router;
