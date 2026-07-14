const { Tournament, Match, Player, Club } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
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

async function create(data) {
  const tournament = await Tournament.create({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    settings: data.settings,
  });

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
  return {
    ...tournament.toJSON(),
    playerCount,
    matchCount,
  };
}

async function list(query = {}) {
  const where = {};
  if (query.completed !== undefined) {
    where.isCompleted = query.completed === 'true';
  }
  const tournaments = await Tournament.findAll({ where, order: [['createdat', 'DESC']] });
  return { tournaments, total: tournaments.length };
}

async function updateSettings(id, settings) {
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
  await tournament.update({ settings });

  const excludedPlayers = await findExcludedPlayers(id);
  return {
    ...tournament.toJSON(),
    excludedPlayers,
  };
}

async function markComplete(id) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  await tournament.update({ isCompleted: true });
  return tournament;
}

module.exports = {
  create,
  getById,
  list,
  updateSettings,
  markComplete,
  findExcludedPlayers,
  buildExclusionReason,
  hasInProgressMatches,
};
