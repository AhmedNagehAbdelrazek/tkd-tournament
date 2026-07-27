const router = require('express').Router();
const authRoutes = require('./authRoutes');
const tournamentRoutes = require('./tournamentRoutes');
const playerRoutes = require('./playerRoutes');
const clubRoutes = require('./clubRoutes');
const matchRoutes = require('./matchRoutes');
const categoryRoutes = require('./categoryRoutes');

// --- IN DOC ---
router.use('/auth', authRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/categories', categoryRoutes);
router.use('/players', playerRoutes);
router.use('/clubs', clubRoutes);
router.use('/matches', matchRoutes);

// --- NOT IN DOC (commented out, maybe use later) ---
// const protect = require('../middlewares/protect');
// const roleGuard = require('../middlewares/roleGuard');
// const { permissionGuard } = require('../middlewares/roleGuard');
// const { ROLES } = require('../config/constants');
// const uploadRoutes = require('./uploadRoutes');
// const healthRoutes = require('./healthRoutes');
// const adminRoutes = require('./adminRoutes');
// const dashboardRoutes = require('./dashboardRoutes');
// router.use('/healthz', healthRoutes);
// router.use('/upload', uploadRoutes);
// router.use('/admin', adminRoutes);
// router.use('/dashboard', dashboardRoutes);

module.exports = router;
