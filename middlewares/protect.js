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
      email: decoded.email,
      role: decoded.role,
    };

    if (decoded.role === 'super_admin') {
      const admin = await User.findByPk(decoded.id);
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

module.exports = protect;
module.exports.protect = protect;