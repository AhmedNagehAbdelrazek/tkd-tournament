const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const c = require('../Controllers/tournamentController');
const bc = require('../Controllers/bracketController');
const validate = require('../middlewares/validatorMiddleware');
const { createTournamentValidation, updateSettingsValidation } = require('../utils/validators/tournamentValidator');
const { getBracketValidation, overrideValidation } = require('../utils/validators/bracketValidator');

function adminGuard(req, res, next) {
  const globalAdmin = ['admin', 'super_admin'].includes(req.user?.globalRole);
  const tkdAdmin = req.user?.tkdRole === 'ADMIN';
  if (globalAdmin || tkdAdmin) return next();
  return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied. Admin role required.' } });
}

router.get('/', protect, c.list);
router.get('/:id', protect, c.getById);
router.get('/:id/excluded-players', protect, c.getExcludedPlayers);
router.get('/:id/bracket', protect, getBracketValidation, validate, bc.getBracket);
router.post('/', protect, adminGuard, createTournamentValidation, validate, c.create);
router.put('/:id/settings', protect, adminGuard, updateSettingsValidation, validate, c.updateSettings);
router.post('/:id/bracket/override', protect, tkdRoleGuard('HEAD_JUDGE'), overrideValidation, validate, bc.overrideMatchSlot);

module.exports = router;
