const router = require('express').Router();
const protect = require('../middlewares/protect');
const c = require('../Controllers/categoryController');

router.get('/:categoryId', protect, c.getById);

module.exports = router;
