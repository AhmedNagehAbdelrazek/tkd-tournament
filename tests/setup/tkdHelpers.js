const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function tkdToken(overrides = {}) {
  return jwt.sign(
    { id: 1, role: 'super_admin', ...overrides },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { tkdToken, authHeader };