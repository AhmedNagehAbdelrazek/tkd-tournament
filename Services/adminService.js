const { User, Match } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { logAudit, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../Services/auditService');
const { ROLES } = require('../config/constants');
const { Op } = require('sequelize');

const ASSIGNABLE_ROLES = [ROLES.SUPER_ADMIN, ROLES.COACH, ROLES.CUSTOMER];

async function listUsers(query = {}) {
  const { page, limit, offset, pageSize } = parsePagination(query);
  const where = {};

  if (query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.search}%` } },
      { email: { [Op.iLike]: `%${query.search}%` } },
    ];
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true';
  }
  if (query.role) {
    where.role = query.role;
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    order: [['createdat', 'DESC']],
    limit,
    offset,
  });

  return buildPaginatedResponse(rows, count, page, pageSize);
}

async function assignRole(userId, role, actorId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiErrors.notFound('User not found');
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    throw ApiErrors.forbidden('Cannot modify super admin roles');
  }

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw ApiErrors.badRequest(`Invalid role: ${role}`);
  }

  const previousRole = user.role;
  await user.update({ role });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.ASSIGN_ROLE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      metadata: { previousRole, newRole: role, userName: user.name, userEmail: user.email },
    });
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function deactivateUser(userId, actorId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiErrors.notFound('User not found');
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    throw ApiErrors.forbidden('Cannot deactivate super admin');
  }

  const activeJudgingMatch = await Match.findOne({
    where: {
      status: { [Op.in]: ['SCHEDULED', 'IN_PROGRESS'] },
      [Op.or]: [
        { player1Id: userId },
        { player2Id: userId },
      ],
    },
  });
  if (activeJudgingMatch) {
    throw ApiErrors.conflict('Cannot deactivate user with active match assignments');
  }

  await user.update({ isActive: false });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.DEACTIVATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      metadata: { userName: user.name, userEmail: user.email },
    });
  }

  return { id: user.id, name: user.name, email: user.email, isActive: user.isActive };
}

async function reactivateUser(userId, actorId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiErrors.notFound('User not found');
  }

  await user.update({ isActive: true });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.REACTIVATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      metadata: { userName: user.name, userEmail: user.email },
    });
  }

  return { id: user.id, name: user.name, email: user.email, isActive: user.isActive };
}

module.exports = { listUsers, assignRole, deactivateUser, reactivateUser };
