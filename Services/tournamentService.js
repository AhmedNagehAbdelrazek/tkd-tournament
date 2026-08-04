const { Tournament, Match, Player, Club, TournamentClub, Category } = require('../Models');
const sequelize = require('../config/database');
const { ApiErrors } = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { logAudit, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../Services/auditService');
const { generateAllBrackets } = require('../Services/matchmakingService');
const { Op } = require('sequelize');

function buildExclusionReason(player, tournament) {
  const genderClasses = tournament.settings?.weightClasses?.[player.gender] || [];
  if (genderClasses.length === 0) {
    return `No weight classes configured for ${player.gender} division`;
  }
  const rangeList = genderClasses.map((wc) => wc.name).join(', ');
  return `No ${player.gender} weight class matches ${parseFloat(player.weight)}kg — available ranges: ${rangeList}`;
}

function computeTournamentStatus(tournament) {
  const now = new Date();
  if (tournament.isCompleted) return 'completed';
  const start = new Date(tournament.startDate);
  const end = new Date(tournament.endDate);
  if (now < start) return 'upcoming';
  if (now > end) return 'completed';
  return 'ongoing';
}

async function buildTournamentResponse(tournament, categoryRecords) {
  const categories = categoryRecords || await Category.findAll({ where: { tournamentId: tournament.id } });
  const playerCount = await Player.count({ where: { tournamentId: tournament.id } });
  const matchCount = await Match.count({ where: { tournamentId: tournament.id } });
  const bracketDepth = categories.length > 0 ? categories[0].bracketDepth : null;

  return {
    id: String(tournament.id),
    name: tournament.name,
    status: computeTournamentStatus(tournament),
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    categories: categories.map(c => String(c.id)),
    bracketDepth,
    registeredPlayers: playerCount,
    matchesPlayed: matchCount,
  };
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
    settings: data.settings || {},
  });

  const clubIds = data.clubs || data.clubIds || [];
  if (clubIds.length > 0) {
    const tcData = clubIds.map((clubId) => ({ tournamentId: tournament.id, clubId: parseInt(clubId) || clubId }));
    await TournamentClub.bulkCreate(tcData);
  }

  if (data.categories) {
    const categories = data.categories;
    const gender = categories.gender || 'Both';
    const bracketDepth = categories.bracketDepth || 4;
    const weights = categories.weights || {};
    const categoryRecords = [];

    if (gender === 'Male' || gender === 'Both') {
      const males = weights.males || [];
      for (const wc of males) {
        const cat = await Category.create({
          name: `${wc.name} - male`,
          tournamentId: tournament.id,
          bracketDepth,
          gender: 'MALE',
          minWeight: wc.minWeight,
          maxWeight: wc.maxWeight,
        });
        categoryRecords.push(cat);
      }
    }

    if (gender === 'Female' || gender === 'Both') {
      const females = weights.females || [];
      for (const wc of females) {
        const cat = await Category.create({
          name: `${wc.name} - female`,
          tournamentId: tournament.id,
          bracketDepth,
          gender: 'FEMALE',
          minWeight: wc.minWeight,
          maxWeight: wc.maxWeight,
        });
        categoryRecords.push(cat);
      }
    }

    if (!tournament.settings.weightClasses) {
      tournament.settings.weightClasses = {};
    }
    if (gender === 'Male' || gender === 'Both') {
      tournament.settings.weightClasses.MALE = (weights.males || []).map(w => ({
        name: w.name, min: w.minWeight, max: w.maxWeight,
      }));
    }
    if (gender === 'Female' || gender === 'Both') {
      tournament.settings.weightClasses.FEMALE = (weights.females || []).map(w => ({
        name: w.name, min: w.minWeight, max: w.maxWeight,
      }));
    }
    await tournament.update({ settings: tournament.settings });

    if (actorId) {
      logAudit({
        actorId,
        action: AUDIT_ACTIONS.CREATE,
        entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
        entityId: tournament.id,
        metadata: { name: tournament.name, clubIds, categoriesCount: categoryRecords.length },
      });
    }

    // ponytail: auto-generate brackets for all categories — empty if no players registered yet
    const brackets = await generateAllBrackets(tournament.id);
    const response = buildTournamentResponse(tournament, categoryRecords);
    return { ...response, brackets };
  }

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: tournament.id,
      metadata: { name: tournament.name, clubIds },
    });
  }

  return buildTournamentResponse(tournament);
}

async function getById(id) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  return buildTournamentResponse(tournament);
}

async function update(id, data, actorId) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  if (tournament.isCompleted) {
    throw ApiErrors.badRequest('Cannot modify a completed tournament');
  }

  const previous = { name: tournament.name, startDate: tournament.startDate, endDate: tournament.endDate, categories: data.categories };
  const datesOrCategoriesChanged = (
    (data.startDate && data.startDate !== String(tournament.startDate)) ||
    (data.endDate && data.endDate !== String(tournament.endDate)) ||
    data.categories
  );

  await tournament.update({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.startDate !== undefined && { startDate: data.startDate }),
    ...(data.endDate !== undefined && { endDate: data.endDate }),
  });

  if (data.categories) {
    await Category.destroy({ where: { tournamentId: id } });
    const categories = data.categories;
    const gender = categories.gender || 'Both';
    const bracketDepth = categories.bracketDepth || 4;
    const weights = categories.weights || {};

    if (gender === 'Male' || gender === 'Both') {
      for (const wc of (weights.males || [])) {
        await Category.create({
          name: `${wc.name} - male`, tournamentId: id, bracketDepth, gender: 'MALE', minWeight: wc.minWeight, maxWeight: wc.maxWeight,
        });
      }
    }
    if (gender === 'Female' || gender === 'Both') {
      for (const wc of (weights.females || [])) {
        await Category.create({
          name: `${wc.name} - female`, tournamentId: id, bracketDepth, gender: 'FEMALE', minWeight: wc.minWeight, maxWeight: wc.maxWeight,
        });
      }
    }

    if (!tournament.settings.weightClasses) tournament.settings.weightClasses = {};
    if (gender === 'Male' || gender === 'Both') {
      tournament.settings.weightClasses.MALE = (weights.males || []).map(w => ({ name: w.name, min: w.minWeight, max: w.maxWeight }));
    }
    if (gender === 'Female' || gender === 'Both') {
      tournament.settings.weightClasses.FEMALE = (weights.females || []).map(w => ({ name: w.name, min: w.minWeight, max: w.maxWeight }));
    }
    await tournament.update({ settings: tournament.settings });
  }

  if (datesOrCategoriesChanged) {
    await Match.destroy({ where: { tournamentId: id } });
    // ponytail: auto-regenerate brackets after category/settings change
    await generateAllBrackets(id);
  }

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: tournament.id,
      metadata: { previous, updates: data, bracketRegenerated: datesOrCategoriesChanged },
    });
  }

  return buildTournamentResponse(tournament);
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
  const response = await buildTournamentResponse(tournament);
  return { ...response, excludedPlayers };
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

  return buildTournamentResponse(tournament);
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
}

async function list(query = {}) {
  const { page, limit, offset, pageSize } = parsePagination(query);
  const where = {};

  if (query.search) {
    where.name = { [Op.iLike]: `%${query.search}%` };
  }

  let tournaments = await Tournament.findAll({
    where,
    order: [['createdat', 'DESC']],
    limit,
    offset,
  });

  if (query.status) {
    tournaments = tournaments.filter(t => computeTournamentStatus(t) === query.status);
  }

  const tournamentsWithCounts = await Promise.all(
    tournaments.map(async (t) => buildTournamentResponse(t))
  );

  return buildPaginatedResponse(tournamentsWithCounts, tournamentsWithCounts.length, page, pageSize);
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
      status: 'SCHEDULED',
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
  const { page, limit, offset, pageSize } = parsePagination(query);
  const where = {};

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
    rows.map(async (t) => buildTournamentResponse(t))
  );

  return buildPaginatedResponse(tournamentsWithCounts, count, page, pageSize);
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
  computeTournamentStatus,
  buildTournamentResponse,
};
