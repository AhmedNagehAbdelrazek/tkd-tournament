const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const c = require('../Controllers/clubController');

router.get('/', protect, c.list);
router.post('/', protect, tkdRoleGuard('ADMIN'), c.create);

module.exports = router;
