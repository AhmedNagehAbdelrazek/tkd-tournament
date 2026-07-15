const { Tournament, Club, TournamentClub } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { logAudit, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('./auditService');

async function registerClub(tournamentId, clubId, actorId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw ApiErrors.notFound('Tournament not found');

  const club = await Club.findByPk(clubId);
  if (!club) throw ApiErrors.notFound('Club not found');

  const existing = await TournamentClub.findOne({ where: { tournamentId, clubId } });
  if (existing) throw ApiErrors.conflict('Club already registered for this tournament');

  await TournamentClub.create({ tournamentId, clubId });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: tournamentId,
      metadata: { action: 'registerClub', clubId, clubName: club.name },
    });
  }

  return { tournamentId, clubId, clubName: club.name };
}

async function deregisterClub(tournamentId, clubId, actorId) {
  const row = await TournamentClub.findOne({ where: { tournamentId, clubId } });
  if (!row) throw ApiErrors.notFound('Club not registered for this tournament');

  const playerCount = await require('../Models').Player.count({ where: { tournamentId, clubId } });
  if (playerCount > 0) {
    throw ApiErrors.conflict('Cannot deregister club with players in this tournament');
  }

  await row.destroy();

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.DELETE,
      entityType: AUDIT_ENTITY_TYPES.TOURNAMENT,
      entityId: tournamentId,
      metadata: { action: 'deregisterClub', clubId },
    });
  }

  return { message: 'Club deregistered successfully' };
}

async function listClubs(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw ApiErrors.notFound('Tournament not found');

  const clubs = await Club.findAll({
    include: [{
      model: Tournament,
      where: { id: tournamentId },
      attributes: [],
    }],
    order: [['name', 'ASC']],
  });

  return clubs;
}

async function listTournaments(clubId) {
  const club = await Club.findByPk(clubId);
  if (!club) throw ApiErrors.notFound('Club not found');

  const tournaments = await Tournament.findAll({
    include: [{
      model: Club,
      where: { id: clubId },
      attributes: [],
    }],
    order: [['createdat', 'DESC']],
  });

  return tournaments;
}

// ponytail: helper — used by matchmakingService to get registered club IDs
async function getRegisteredClubIds(tournamentId) {
  const rows = await TournamentClub.findAll({
    where: { tournamentId },
    attributes: ['clubId'],
    raw: true,
  });
  return rows.map((r) => r.clubId);
}

module.exports = { registerClub, deregisterClub, listClubs, listTournaments, getRegisteredClubIds };
