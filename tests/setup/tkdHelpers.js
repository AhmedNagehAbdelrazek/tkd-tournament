const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// ponytail: token factory — minimal, no Admin model dependency
function tkdToken(overrides = {}) {
  return jwt.sign(
    { id: 1, globalRole: 'customer', tkdRole: 'ADMIN', ...overrides },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { tkdToken, authHeader };
