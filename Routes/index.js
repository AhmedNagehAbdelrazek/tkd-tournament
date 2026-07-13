const router = require('express').Router();
const protect = require('../middlewares/protect');
const roleGuard = require('../middlewares/roleGuard');
const { permissionGuard } = require('../middlewares/roleGuard');
const { ROLES } = require('../config/constants');

const uploadRoutes = require('./uploadRoutes');
const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');
const tournamentRoutes = require('./tournamentRoutes');
const playerRoutes = require('./playerRoutes');
const clubRoutes = require('./clubRoutes');
const matchRoutes = require('./matchRoutes');

router.use('/healthz', healthRoutes);
router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/players', playerRoutes);
router.use('/clubs', clubRoutes);
router.use('/matches', matchRoutes);

module.exports = router;
