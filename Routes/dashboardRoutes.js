const router = require('express').Router();
const protect = require('../middlewares/protect');
const c = require('../Controllers/tournamentController');

router.get('/tournaments', protect, c.getTournamentList);
router.get('/tournaments/:id/overview', protect, c.getOverview);

module.exports = router;
