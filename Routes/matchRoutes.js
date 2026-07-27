const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const rateLimiter = require('../middlewares/rateLimiter');
const lc = require('../Controllers/liveMatchController');
const c = require('../Controllers/matchController');

// --- IN DOC ---
router.get('/', protect, c.list);
router.get('/:matchId/live', protect, lc.getLiveMatch);
router.post('/:matchId/live/action', protect, tkdRoleGuard('MAT_JUDGE'), lc.performAction);
router.post('/:matchId/live/points', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(2), lc.addPoints);
router.post('/:matchId/live/points/undo', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(2), lc.undoPoints);
router.post('/:matchId/live/penalty', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(1), lc.addPenalty);
router.post('/:matchId/live/injury', protect, tkdRoleGuard('MAT_JUDGE'), lc.setInjury);
router.post('/:matchId/live/exclude', protect, tkdRoleGuard('MAT_JUDGE'), lc.excludePlayer);
router.get('/:matchId/suggestions', protect, lc.getSuggestions);

// --- NOT IN DOC (commented out, maybe use later) ---
// const adminGuard = require('../middlewares/adminGuard');
// const validate = require('../middlewares/validatorMiddleware');
// const { addPointValidation, removePointValidation, endRoundValidation, generateMatchValidation, endMatchValidation, scheduleMatchValidation, rescheduleMatchValidation, walkoverValidation } = require('../utils/validators/matchValidator');
// router.post('/generate', protect, tkdRoleGuard('HEAD_JUDGE'), generateMatchValidation, validate, c.generate);
// router.post('/schedule', protect, adminGuard, scheduleMatchValidation, validate, c.schedule);
// router.get('/:id', protect, rateLimiter(10), c.getById);
// router.post('/:id/start', protect, tkdRoleGuard('MAT_JUDGE'), c.start);
// router.post('/:id/pause', protect, tkdRoleGuard('MAT_JUDGE'), c.pause);
// router.post('/:id/resume', protect, tkdRoleGuard('MAT_JUDGE'), c.resume);
// router.post('/:id/end', protect, tkdRoleGuard('MAT_JUDGE'), endMatchValidation, validate, c.endMatch);
// router.post('/:id/cancel', protect, c.cancel);
// router.put('/:id/reschedule', protect, adminGuard, rescheduleMatchValidation, validate, c.reschedule);
// router.post('/:id/walkover', protect, adminGuard, walkoverValidation, validate, c.walkover);
// router.post('/:id/points', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(2), addPointValidation, validate, c.addPoint);
// router.post('/:id/remove-points', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(2), removePointValidation, validate, c.removePoint);
// router.post('/:id/end-round', protect, tkdRoleGuard('MAT_JUDGE'), rateLimiter(1), endRoundValidation, validate, c.endRound);

module.exports = router;
