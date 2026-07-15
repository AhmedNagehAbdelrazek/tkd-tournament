const { ApiErrors } = require('../utils/ApiError');

function adminGuard(req, res, next) {
  const globalAdmin = ['admin', 'super_admin'].includes(req.user?.globalRole);
  if (globalAdmin) return next();
  return next(ApiErrors.forbidden('Access denied. Admin role required.'));
}

module.exports = adminGuard;
