const router = require('express').Router();
const c = require('../Controllers/authController');
const protect = require('../middlewares/protect');
const validate = require('../middlewares/validatorMiddleware');
const { tkdLogin } = require('../Services/tkdAuthService');
const { successResponse } = require('../utils/httpResponse');
const { body } = require('express-validator');

const tkdLoginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/signup', c.signup);
router.post('/login', c.login);
router.get('/me', protect, c.me);
router.patch('/me', protect, c.updateProfile);
router.post('/tkd/login', tkdLoginValidation, validate, async (req, res, next) => {
  try {
    const result = await tkdLogin(req.body);
    successResponse(res, result);
  } catch (err) { next(err); }
});

module.exports = router;
