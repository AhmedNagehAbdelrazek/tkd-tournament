const { Tournament, Match } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');

async function create(data) {
  const tournament = await Tournament.create({
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    settings: data.settings,
  });
  return tournament;
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
  await tournament.update({ settings });
  return tournament;
}

async function markComplete(id) {
  const tournament = await Tournament.findByPk(id);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  await tournament.update({ isCompleted: true });
  return tournament;
}

module.exports = { create, getById, list, updateSettings, markComplete };
