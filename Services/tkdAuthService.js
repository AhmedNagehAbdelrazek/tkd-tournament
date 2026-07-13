const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { TKD_ROLES } = require('../config/constants');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '24h';

const TKD_VALID_ROLES = Object.values(TKD_ROLES);

async function tkdLogin({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiErrors.unauthorized('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw ApiErrors.unauthorized('Invalid email or password');
  }

  const tkdRole = user.tkdRole || user.role;

  if (!TKD_VALID_ROLES.includes(tkdRole)) {
    throw ApiErrors.forbidden('User does not have TKD tournament access');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, tkdRole },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: tkdRole,
    },
  };
}

module.exports = { tkdLogin };
