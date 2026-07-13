const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const c = require('../Controllers/clubController');
const validate = require('../middlewares/validatorMiddleware');
const { createClubValidation } = require('../utils/validators/clubValidator');

router.get('/', protect, c.list);
router.post('/', protect, tkdRoleGuard('ADMIN'), createClubValidation, validate, c.create);

module.exports = router;
