const { Tournament, Match, Player, Club, sequelize } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../Services/auditService');
const { MATCH_STATUS } = require('../config/constants');
const { Op } = require('sequelize');

function buildExclusionReason(player, tournament) {
  const genderClasses = tournament.settings?.weightClasses?.[player.gender] || [];
  if (genderClasses.length === 0) {
    return `No weight classes configured for ${player.gender} division`;
  }
  const rangeList = genderClasses.map((wc) => wc.name).join(', ');
  return `No ${player.gender} weight class matches ${parseFloat(player.weight)}kg — available ranges: ${rangeList}`;
}

async function findExcludedPlayers(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const players = await Player.findAll({
    where: { tournamentId },
    include: [{ model: Club, attributes: ['name'] }],
  });

  const excluded = [];
  for (const player of players) {
    const genderClasses = tournament.settings?.weightClasses?.[player.gender] || [];
    const weight = parseFloat(player.weight);
    const matches = genderClasses.some((wc) => weight >= wc.min && weight <= wc.max);
    if (!matches) {
      excluded.push({
        id: player.id,
        name: player.name,
        gender: player.gender,
        weight,
        clubName: player.Club?.name || null,
        reason: buildExclusionReason(player, tournament),
      });
    }
  }
  return excluded;
}

async function hasInProgressMatches(tournamentId) {
  const count = await Match.count({
    where: { tournamentId, status: 'IN_PROGRESS' },
  });
  return count > 0;
}

async function create(data, actorId) {
  const tournament = await Tournament.create({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    settings: data.settings,
  });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: tournament.id,
      metadata: { name: tournament.name },
    });
  }

  const excludedPlayers = await findExcludedPlayers(tournament.id);
  return {
    ...tournament.toJSON(),
    excludedPlayers,
  };
}

async function getById(id) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  const playerCount = await tournament.countPlayers();
  const matchCount = await Match.count({ where: { tournamentId: id } });

  const statusCounts = await Match.findAll({
    where: { tournamentId: id },
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
    group: ['status'],
    raw: true,
  });
  const matchesByStatus = {};
  for (const row of statusCounts) {
    matchesByStatus[row.status] = parseInt(row.count, 10);
  }

  return {
    ...tournament.toJSON(),
    playerCount,
    matchCount,
    matchesByStatus,
  };
}

async function update(id, data, actorId) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  if (tournament.isCompleted) {
    throw ApiErrors.badRequest('Cannot modify a completed tournament');
  }

  const previous = { name: tournament.name, startDate: tournament.startDate, endDate: tournament.endDate };
  await tournament.update({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.startDate !== undefined && { startDate: data.startDate }),
    ...(data.endDate !== undefined && { endDate: data.endDate }),
  });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: tournament.id,
      metadata: { previous, updates: data },
    });
  }

  return getById(id);
}

async function updateSettings(id, settings, actorId) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  if (tournament.isCompleted) {
    throw ApiErrors.badRequest('Cannot modify a completed tournament');
  }
  if (await hasInProgressMatches(id)) {
    throw ApiErrors.conflict('Cannot update weight classes while matches are in progress');
  }
  const previousSettings = tournament.settings;
  await tournament.update({ settings });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: tournament.id,
      metadata: { field: 'settings', previousSettings, newSettings: settings },
    });
  }

  const excludedPlayers = await findExcludedPlayers(id);
  return {
    ...tournament.toJSON(),
    excludedPlayers,
  };
}

async function markComplete(id, actorId) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  if (tournament.isCompleted) {
    throw ApiErrors.badRequest('Tournament is already completed');
  }
  if (await hasInProgressMatches(id)) {
    throw ApiErrors.conflict('Cannot complete tournament with matches in progress');
  }
  await tournament.update({ isCompleted: true });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.MARK_COMPLETE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: tournament.id,
      metadata: { name: tournament.name },
    });
  }

  return tournament;
}

async function remove(id, actorId) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const playerCount = await Player.count({ where: { tournamentId: id } });
  const matchCount = await Match.count({ where: { tournamentId: id } });
  if (playerCount > 0 || matchCount > 0) {
    throw ApiErrors.conflict('Cannot delete tournament with associated players or matches');
  }

  const tournamentName = tournament.name;
  await tournament.destroy();

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.DELETE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: id,
      metadata: { name: tournamentName },
    });
  }

  return { message: 'Tournament deleted successfully' };
}

async function list(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const where = {};

  if (query.completed !== undefined) {
    where.isCompleted = query.completed === 'true';
  }
  if (query.search) {
    where.name = { [Op.iLike]: `%${query.search}%` };
  }

  const { rows, count } = await Tournament.findAndCountAll({
    where,
    order: [['createdat', 'DESC']],
    limit,
    offset,
  });

  const tournamentsWithCounts = await Promise.all(
    rows.map(async (t) => {
      const playerCount = await t.countPlayers();
      const matchCount = await Match.count({ where: { tournamentId: t.id } });
      return { ...t.toJSON(), playerCount, matchCount };
    })
  );

  const meta = buildPaginationMeta(count, page, limit);
  return { data: tournamentsWithCounts, meta };
}

async function getTournamentOverview(id) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const totalPlayers = await Player.count({ where: { tournamentId: id } });
  const totalMatches = await Match.count({ where: { tournamentId: id } });

  const statusCounts = await Match.findAll({
    where: { tournamentId: id },
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
    group: ['status'],
    raw: true,
  });
  const matchesByStatus = {};
  for (const row of statusCounts) {
    matchesByStatus[row.status] = parseInt(row.count, 10);
  }

  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const upcomingMatches = await Match.count({
    where: {
      tournamentId: id,
      status: MATCH_STATUS.SCHEDULED,
      scheduledTime: { [Op.between]: [now, oneHourFromNow] },
    },
  });

  return {
    tournamentId: id,
    tournamentName: tournament.name,
    isCompleted: tournament.isCompleted,
    totalPlayers,
    totalMatches,
    matchesByStatus,
    upcomingMatches,
  };
}

async function getTournamentList(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const where = {};

  if (query.completed !== undefined) {
    where.isCompleted = query.completed === 'true';
  }
  if (query.search) {
    where.name = { [Op.iLike]: `%${query.search}%` };
  }

  const { rows, count } = await Tournament.findAndCountAll({
    where,
    order: [['createdat', 'DESC']],
    limit,
    offset,
  });

  const tournamentsWithCounts = await Promise.all(
    rows.map(async (t) => {
      const playerCount = await t.countPlayers();
      const matchCount = await Match.count({ where: { tournamentId: t.id } });

      const statusCounts = await Match.findAll({
        where: { tournamentId: t.id },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
        group: ['status'],
        raw: true,
      });
      const matchesByStatus = {};
      for (const row of statusCounts) {
        matchesByStatus[row.status] = parseInt(row.count, 10);
      }

      return {
        ...t.toJSON(),
        playerCount,
        matchCount,
        matchesByStatus,
      };
    })
  );

  const meta = buildPaginationMeta(count, page, limit);
  return { data: tournamentsWithCounts, meta };
}

module.exports = {
  create,
  getById,
  list,
  update,
  updateSettings,
  markComplete,
  remove,
  findExcludedPlayers,
  buildExclusionReason,
  hasInProgressMatches,
  getTournamentOverview,
  getTournamentList,
};
