const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdProtect, tkdRoleGuard } = require('../middlewares/protect');
const c = require('../Controllers/matchController');
const rateLimiter = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validatorMiddleware');
const { addPointValidation, removePointValidation, endRoundValidation, generateMatchValidation, endMatchValidation } = require('../utils/validators/matchValidator');

router.post('/generate', protect, tkdRoleGuard('HEAD_JUDGE'), generateMatchValidation, validate, c.generate);
router.get('/:id', protect, rateLimiter(10), c.getById);
router.post('/:id/start', protect, tkdRoleGuard('MAT_JUDGE'), c.start);
router.post('/:id/pause', protect, tkdRoleGuard('MAT_JUDGE'), c.pause);
router.post('/:id/resume', protect, tkdRoleGuard('MAT_JUDGE'), c.resume);
router.post('/:id/end', protect, tkdRoleGuard('MAT_JUDGE'), endMatchValidation, validate, c.endMatch);
router.post('/:id/cancel', protect, c.cancel);

router.post('/:id/points', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(2), addPointValidation, validate, c.addPoint);
router.post('/:id/remove-points', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(2), removePointValidation, validate, c.removePoint);
router.post('/:id/end-round', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(1), endRoundValidation, validate, c.endRound);

module.exports = router;
