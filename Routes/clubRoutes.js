const router = require('express').Router();
const protect = require('../middlewares/protect');
const adminGuard = require('../middlewares/adminGuard');
const c = require('../Controllers/clubController');
const validate = require('../middlewares/validatorMiddleware');
const { createClubValidation, updateClubValidation, deleteClubValidation } = require('../utils/validators/clubValidator');

router.get('/', protect, c.list);
router.get('/:id', protect, c.getById);
router.post('/', protect, adminGuard, createClubValidation, validate, c.create);
router.put('/:id', protect, adminGuard, updateClubValidation, validate, c.update);
router.delete('/:id', protect, adminGuard, deleteClubValidation, validate, c.remove);

module.exports = router;
