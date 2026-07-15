const { Club, Player } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../Services/auditService');
const { Op } = require('sequelize');

async function create(data, actorId) {
  const existing = await Club.findOne({ where: { name: data.name } });
  if (existing) {
    throw ApiErrors.conflict('Club with this name already exists');
  }
  const club = await Club.create({ name: data.name });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.CLUB,
      entityId: club.id,
      metadata: { name: club.name },
    });
  }

  return club;
}

async function getById(id) {
  const club = await Club.findByPk(id, {
    attributes: {
      include: [
        [
          require('sequelize').literal('(SELECT COUNT(*) FROM players WHERE players.club_id = "Club".id)'),
          'playerCount',
        ],
      ],
    },
  });
  if (!club) {
    throw ApiErrors.notFound('Club not found');
  }
  return club;
}

async function update(id, data, actorId) {
  const club = await Club.findByPk(id);
  if (!club) {
    throw ApiErrors.notFound('Club not found');
  }

  if (data.name !== club.name) {
    const existing = await Club.findOne({ where: { name: data.name } });
    if (existing) {
      throw ApiErrors.conflict('Club name already taken');
    }
  }

  const previousName = club.name;
  await club.update({ name: data.name });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: AUDIT_ENTITY_TYPES.CLUB,
      entityId: club.id,
      metadata: { previousName, newName: data.name },
    });
  }

  return getById(id);
}

async function remove(id, actorId) {
  const club = await Club.findByPk(id);
  if (!club) {
    throw ApiErrors.notFound('Club not found');
  }

  const playerCount = await Player.count({ where: { clubId: id } });
  if (playerCount > 0) {
    throw ApiErrors.conflict('Cannot delete club with assigned players');
  }

  const clubName = club.name;
  await club.destroy();

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.DELETE,
      entityType: AUDIT_ENTITY_TYPES.CLUB,
      entityId: id,
      metadata: { name: clubName },
    });
  }

  return { message: 'Club deleted successfully' };
}

async function list(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const where = {};

  if (query.search) {
    where.name = { [Op.iLike]: `%${query.search}%` };
  }

  const { rows, count } = await Club.findAndCountAll({
    where,
    attributes: {
      include: [
        [
          require('sequelize').literal('(SELECT COUNT(*) FROM players WHERE players.club_id = "Club".id)'),
          'playerCount',
        ],
      ],
    },
    order: [['name', 'ASC']],
    limit,
    offset,
  });

  const meta = buildPaginationMeta(count, page, limit);
  return { data: rows, meta };
}

module.exports = { create, list, getById, update, remove };
