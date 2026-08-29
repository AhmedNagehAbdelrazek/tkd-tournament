const { ApiErrors } = require('../utils/ApiError');

function adminGuard(req, res, next) {
  if (req.user?.role === 'super_admin') return next();
  return next(ApiErrors.forbidden('Access denied. Admin role required.'));
}

module.exports = adminGuard;