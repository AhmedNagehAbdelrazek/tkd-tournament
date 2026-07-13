const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const c = require('../Controllers/playerController');

router.get('/', protect, c.list);
router.post('/', protect, tkdRoleGuard('ADMIN'), c.create);
router.post('/bulk', protect, tkdRoleGuard('ADMIN'), c.bulkCreate);

module.exports = router;
