const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const c = require('../Controllers/tournamentController');
const validate = require('../middlewares/validatorMiddleware');
const { createTournamentValidation, updateSettingsValidation } = require('../utils/validators/tournamentValidator');

function adminGuard(req, res, next) {
  const globalAdmin = ['admin', 'super_admin'].includes(req.user?.globalRole);
  const tkdAdmin = req.user?.tkdRole === 'ADMIN';
  if (globalAdmin || tkdAdmin) return next();
  return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied. Admin role required.' } });
}

router.get('/', protect, c.list);
router.get('/:id', protect, c.getById);
router.get('/:id/excluded-players', protect, c.getExcludedPlayers);
router.post('/', protect, adminGuard, createTournamentValidation, validate, c.create);
router.put('/:id/settings', protect, adminGuard, updateSettingsValidation, validate, c.updateSettings);

module.exports = router;
