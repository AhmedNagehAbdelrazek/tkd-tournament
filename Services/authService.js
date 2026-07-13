const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const auditService = require('./auditService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '24h';
const SALT_ROUNDS = 12;

async function signup({ email, password, name }) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw ApiErrors.conflict('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    email,
    password: hashedPassword,
    name,
    role: 'customer',
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, globalRole: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  auditService.logAudit('CREATE', 'user', user.id, user.email, `Customer signed up: ${user.email}`);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiErrors.unauthorized('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw ApiErrors.unauthorized('Invalid email or password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, globalRole: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  auditService.logAudit('LOGIN', 'user', user.id, user.email, `Customer logged in: ${user.email}`);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

async function me(user) {
  const found = await User.findByPk(user.id);
  if (!found) {
    throw ApiErrors.notFound('User not found');
  }
  return {
    id: found.id,
    email: found.email,
    name: found.name,
    role: found.role,
  };
}

async function updateProfile(userId, data) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiErrors.notFound('User not found');
  }

  if (data.email && data.email !== user.email) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      throw ApiErrors.conflict('Email is already in use');
    }
  }

  await user.update(data);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    contactInfo: user.contactInfo,
    address: user.address,
    profilePictureUrl: user.profilePictureUrl,
  };
}

module.exports = { signup, login, me, updateProfile };
