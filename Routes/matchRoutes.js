const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdProtect, tkdRoleGuard } = require('../middlewares/protect');
const c = require('../Controllers/matchController');

router.post('/generate', protect, tkdRoleGuard('HEAD_JUDGE'), c.generate);
router.get('/:id', protect, c.getById);
router.post('/:id/start', protect, tkdRoleGuard('MAT_JUDGE'), c.start);
router.post('/:id/pause', protect, tkdRoleGuard('MAT_JUDGE'), c.pause);
router.post('/:id/resume', protect, tkdRoleGuard('MAT_JUDGE'), c.resume);
router.post('/:id/end', protect, tkdRoleGuard('MAT_JUDGE'), c.endMatch);
router.post('/:id/cancel', protect, c.cancel);

module.exports = router;
