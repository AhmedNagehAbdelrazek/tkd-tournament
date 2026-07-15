const router = require('express').Router();
const protect = require('../middlewares/protect');
const { tkdRoleGuard } = require('../middlewares/protect');
const adminGuard = require('../middlewares/adminGuard');
const c = require('../Controllers/playerController');
const validate = require('../middlewares/validatorMiddleware');
const { createPlayerValidation, bulkCreatePlayerValidation, updatePlayerValidation, deletePlayerValidation } = require('../utils/validators/playerValidator');

router.get('/', protect, c.list);
router.get('/:id', protect, c.getById);
router.post('/', protect, adminGuard, createPlayerValidation, validate, c.create);
router.post('/bulk', protect, adminGuard, bulkCreatePlayerValidation, validate, c.bulkCreate);
router.put('/:id', protect, adminGuard, updatePlayerValidation, validate, c.update);
router.delete('/:id', protect, adminGuard, deletePlayerValidation, validate, c.remove);

module.exports = router;
