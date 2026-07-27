const router = require('express').Router();
const protect = require('../middlewares/protect');
const adminGuard = require('../middlewares/adminGuard');
const c = require('../Controllers/clubController');
const validate = require('../middlewares/validatorMiddleware');
const { createClubValidation } = require('../utils/validators/clubValidator');

// --- IN DOC ---
router.get('/', protect, c.list);
router.post('/', protect, adminGuard, createClubValidation, validate, c.create);

// --- NOT IN DOC (commented out, maybe use later) ---
// const tc = require('../Controllers/tournamentClubController');
// const { updateClubValidation, deleteClubValidation } = require('../utils/validators/clubValidator');
// router.get('/:id', protect, c.getById);
// router.get('/:id/tournaments', protect, tc.listTournaments);
// router.put('/:id', protect, adminGuard, updateClubValidation, validate, c.update);
// router.delete('/:id', protect, adminGuard, deleteClubValidation, validate, c.remove);

module.exports = router;
