const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const c = require('../Controllers/playerController');
const validate = require('../middlewares/validatorMiddleware');
const { createPlayerValidation, bulkCreatePlayerValidation } = require('../utils/validators/playerValidator');

router.get('/', protect, c.list);
router.post('/', protect, tkdRoleGuard('ADMIN'), createPlayerValidation, validate, c.create);
router.post('/bulk', protect, tkdRoleGuard('ADMIN'), bulkCreatePlayerValidation, validate, c.bulkCreate);

module.exports = router;
