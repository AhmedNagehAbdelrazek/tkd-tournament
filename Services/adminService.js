const { User, Match } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../Services/auditService');
const { MATCH_STATUS, ROLES } = require('../config/constants');
const { Op } = require('sequelize');

const TKD_ROLES = ['ADMIN', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER'];

async function listUsers(query = {}) {
  const { page, limit, offset } = parsePagination(query);
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
  if (query.tkdRole) {
    where.tkdRole = query.tkdRole;
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    order: [['createdat', 'DESC']],
    limit,
    offset,
  });

  const meta = buildPaginationMeta(count, page, limit);
  return { data: rows, meta };
}

async function assignRole(userId, tkdRole, actorId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiErrors.notFound('User not found');
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    throw ApiErrors.forbidden('Cannot modify super admin roles');
  }

  if (tkdRole !== null && !TKD_ROLES.includes(tkdRole)) {
    throw ApiErrors.badRequest(`Invalid TKD role: ${tkdRole}`);
  }

  const previousRole = user.tkdRole;
  await user.update({ tkdRole });

  if (actorId) {
    logAudit({
      actorId,
      action: tkdRole ? AUDIT_ACTIONS.ASSIGN_ROLE : AUDIT_ACTIONS.REVOKE_ROLE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      metadata: { previousRole, newRole: tkdRole, userName: user.name, userEmail: user.email },
    });
  }

  return { id: user.id, name: user.name, email: user.email, tkdRole: user.tkdRole };
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
      status: { [Op.in]: [MATCH_STATUS.SCHEDULED, MATCH_STATUS.IN_PROGRESS] },
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
