const jwt = require('jsonwebtoken');
const { ApiErrors } = require('../utils/ApiError');
const { User } = require('../Models');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiErrors.unauthorized('Access denied. No token provided.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      globalRole: decoded.globalRole,
      tkdRole: decoded.tkdRole,
    };

    if (decoded.globalRole === 'admin' || decoded.globalRole === 'super_admin') {
      const admin = await User.findByPk(decoded.id);
      console.log(admin);
      if (!admin || !admin.isActive) {
        return next(ApiErrors.unauthorized('Admin account is inactive or not found.'));
      }
      req.admin = admin;
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiErrors.unauthorized('Token expired. Please login again.'));
    }
    return next(ApiErrors.unauthorized('Invalid token.'));
  }
}

async function tkdProtect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiErrors.unauthorized('Access denied. No token provided.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      tkdRole: decoded.tkdRole,
      globalRole: decoded.globalRole,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiErrors.unauthorized('Token expired. Please login again.'));
    }
    return next(ApiErrors.unauthorized('Invalid token.'));
  }
}

function tkdRoleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.tkdRole) {
      return next(ApiErrors.unauthorized('TKD authentication required.'));
    }
    if (!allowedRoles.includes(req.user.tkdRole)) {
      return next(
        ApiErrors.forbidden('Access denied. You do not have the required TKD role.')
      );
    }
    next();
  };
}

module.exports = protect;
module.exports.protect = protect;
module.exports.tkdProtect = tkdProtect;
module.exports.tkdRoleGuard = tkdRoleGuard;
