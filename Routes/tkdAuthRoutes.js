const router = require('express').Router();
const { tkdLogin } = require('../Services/tkdAuthService');
const { successResponse } = require('../utils/httpResponse');

router.post('/login', async (req, res, next) => {
  try {
    const result = await tkdLogin(req.body);
    successResponse(res, result);
  } catch (err) { next(err); }
});

module.exports = router;
