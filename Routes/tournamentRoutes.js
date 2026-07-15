const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const adminGuard = require('../middlewares/adminGuard');
const c = require('../Controllers/tournamentController');
const bc = require('../Controllers/bracketController');
const validate = require('../middlewares/validatorMiddleware');
const { createTournamentValidation, updateSettingsValidation, updateTournamentValidation, markCompleteValidation, deleteTournamentValidation } = require('../utils/validators/tournamentValidator');
const { getBracketValidation, overrideValidation } = require('../utils/validators/bracketValidator');

router.get('/', protect, c.list);
router.get('/:id', protect, c.getById);
router.get('/:id/excluded-players', protect, c.getExcludedPlayers);
router.get('/:id/bracket', protect, getBracketValidation, validate, bc.getBracket);
router.post('/', protect, adminGuard, createTournamentValidation, validate, c.create);
router.put('/:id', protect, adminGuard, updateTournamentValidation, validate, c.update);
router.put('/:id/settings', protect, adminGuard, updateSettingsValidation, validate, c.updateSettings);
router.post('/:id/complete', protect, adminGuard, markCompleteValidation, validate, c.markComplete);
router.delete('/:id', protect, adminGuard, deleteTournamentValidation, validate, c.remove);
router.post('/:id/bracket/override', protect, tkdRoleGuard('HEAD_JUDGE'), overrideValidation, validate, bc.overrideMatchSlot);

module.exports = router;
