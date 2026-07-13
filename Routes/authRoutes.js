const router = require('express').Router();
const c = require('../Controllers/authController');
const protect = require('../middlewares/protect');

router.post('/signup', c.signup);
router.post('/login', c.login);
router.get('/me', protect, c.me);
router.patch('/me', protect, c.updateProfile);

module.exports = router;
