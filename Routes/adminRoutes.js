const router = require('express').Router();
const protect = require('../middlewares/protect');
const roleGuard = require('../middlewares/roleGuard');
const c = require('../Controllers/adminController');
const rateLimiter = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validatorMiddleware');
const { assignRoleValidation, userIdValidation } = require('../utils/validators/adminValidator');

router.use(protect, roleGuard('super_admin'));

router.get('/users', c.listUsers);
router.put('/users/:id/role', rateLimiter(5), assignRoleValidation, validate, c.assignRole);
router.put('/users/:id/deactivate', rateLimiter(5), userIdValidation, validate, c.deactivateUser);
router.put('/users/:id/reactivate', rateLimiter(5), userIdValidation, validate, c.reactivateUser);

module.exports = router;
