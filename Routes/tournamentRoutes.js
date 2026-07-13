const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const roleGuard = require('../middlewares/roleGuard');
const c = require('../Controllers/tournamentController');

function adminGuard(req, res, next) {
  const globalAdmin = ['admin', 'super_admin'].includes(req.user?.globalRole);
  const tkdAdmin = req.user?.tkdRole === 'ADMIN';
  if (globalAdmin || tkdAdmin) return next();
  return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied. Admin role required.' } });
}

router.get('/', protect, c.list);
router.get('/:id', protect, c.getById);
router.post('/', protect, adminGuard, c.create);

module.exports = router;
