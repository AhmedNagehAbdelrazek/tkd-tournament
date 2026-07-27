const router = require('express').Router();
const protect = require('../middlewares/protect');
const adminGuard = require('../middlewares/adminGuard');
const c = require('../Controllers/tournamentController');
const validate = require('../middlewares/validatorMiddleware');
const { createTournamentValidation, updateTournamentValidation, deleteTournamentValidation } = require('../utils/validators/tournamentValidator');

// --- IN DOC ---
router.get('/', protect, c.list);
router.get('/:id', protect, c.getById);
router.post('/', protect, adminGuard, createTournamentValidation, validate, c.create);
router.put('/:id', protect, adminGuard, updateTournamentValidation, validate, c.update);
router.delete('/:id', protect, adminGuard, deleteTournamentValidation, validate, c.remove);

// --- NOT IN DOC (commented out, maybe use later) ---
// const { tkdRoleGuard } = require('../middlewares/protect');
// const bc = require('../Controllers/bracketController');
// const tc = require('../Controllers/tournamentClubController');
// const { updateSettingsValidation, markCompleteValidation } = require('../utils/validators/tournamentValidator');
// const { getBracketValidation, overrideValidation } = require('../utils/validators/bracketValidator');
// router.get('/:id/excluded-players', protect, c.getExcludedPlayers);
// router.get('/:id/bracket', protect, getBracketValidation, validate, bc.getBracket);
// router.get('/:id/clubs', protect, tc.listClubs);
// router.put('/:id/settings', protect, adminGuard, updateSettingsValidation, validate, c.updateSettings);
// router.post('/:id/complete', protect, adminGuard, markCompleteValidation, validate, c.markComplete);
// router.post('/:id/clubs', protect, adminGuard, tc.registerClub);
// router.delete('/:id/clubs/:clubId', protect, adminGuard, tc.deregisterClub);
// router.post('/:id/bracket/override', protect, tkdRoleGuard('HEAD_JUDGE'), overrideValidation, validate, bc.overrideMatchSlot);

module.exports = router;
