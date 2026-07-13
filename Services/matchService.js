const { Match, Player, MatchEvent } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { MATCH_STATUS, MATCH_EVENT_TYPES } = require('../config/constants');

const validTransitions = {
  [MATCH_STATUS.SCHEDULED]: [MATCH_STATUS.IN_PROGRESS, MATCH_STATUS.CANCELLED],
  [MATCH_STATUS.IN_PROGRESS]: [MATCH_STATUS.PAUSED, MATCH_STATUS.FINISHED, MATCH_STATUS.CANCELLED],
  [MATCH_STATUS.PAUSED]: [MATCH_STATUS.IN_PROGRESS],
  [MATCH_STATUS.FINISHED]: [],
  [MATCH_STATUS.CANCELLED]: [],
};

function validateTransition(currentStatus, targetStatus) {
  const allowed = validTransitions[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw ApiErrors.conflict('Invalid state transition');
  }
}

async function startMatch(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  validateTransition(match.status, MATCH_STATUS.IN_PROGRESS);
  match.status = MATCH_STATUS.IN_PROGRESS;
  match.currentRound = 1;
  await match.save();
  await MatchEvent.create({ matchId: match.id, type: MATCH_EVENT_TYPES.START, roundNumber: 1 });
  return { id: match.id, status: match.status, startedAt: new Date(), currentRound: match.currentRound };
}

async function pauseMatch(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  validateTransition(match.status, MATCH_STATUS.PAUSED);
  match.status = MATCH_STATUS.PAUSED;
  await match.save();
  await MatchEvent.create({ matchId: match.id, type: MATCH_EVENT_TYPES.PAUSE, roundNumber: match.currentRound });
  return { id: match.id, status: match.status, pausedAt: new Date() };
}

async function resumeMatch(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  validateTransition(match.status, MATCH_STATUS.IN_PROGRESS);
  match.status = MATCH_STATUS.IN_PROGRESS;
  await match.save();
  await MatchEvent.create({ matchId: match.id, type: MATCH_EVENT_TYPES.RESUME, roundNumber: match.currentRound });
  return { id: match.id, status: match.status, resumedAt: new Date() };
}

async function endMatch(matchId, winnerId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  validateTransition(match.status, MATCH_STATUS.FINISHED);
  if (winnerId && winnerId !== match.player1Id && winnerId !== match.player2Id) {
    throw ApiErrors.badRequest('Winner must be one of the match players');
  }
  match.status = MATCH_STATUS.FINISHED;
  match.winnerId = winnerId || null;
  match.endTime = new Date();
  await match.save();
  await MatchEvent.create({
    matchId: match.id,
    type: MATCH_EVENT_TYPES.FINISHED,
    roundNumber: match.currentRound,
    metadata: {
      winner: winnerId,
      finalScore: { player1: match.scorePlayer1, player2: match.scorePlayer2 }
    }
  });
  return {
    id: match.id, status: match.status, winnerId: match.winnerId, endTime: match.endTime,
    finalScore: { player1: match.scorePlayer1, player2: match.scorePlayer2 }
  };
}

async function cancelMatch(matchId, cancelledByRole) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  validateTransition(match.status, MATCH_STATUS.CANCELLED);
  if (match.status === MATCH_STATUS.IN_PROGRESS && cancelledByRole !== 'ADMIN')
    throw ApiErrors.forbidden('Only Admins can cancel ongoing matches');
  if (match.status === MATCH_STATUS.SCHEDULED && cancelledByRole === 'SCOREKEEPER')
    throw ApiErrors.forbidden('Scorekeepers cannot cancel matches');
  match.status = MATCH_STATUS.CANCELLED;
  await match.save();
  await MatchEvent.create({ matchId: match.id, type: MATCH_EVENT_TYPES.CANCEL, roundNumber: match.currentRound });
  return { id: match.id, status: match.status, cancelledAt: new Date() };
}

async function getMatchState(matchId) {
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'] },
      { model: Player, as: 'player2', attributes: ['id', 'name'] },
      { model: MatchEvent, order: [['createdat', 'DESC']], limit: 1 },
    ],
  });
  if (!match) throw ApiErrors.notFound('Match not found');
  return match;
}

async function listMatches(tournamentId) {
  const where = {};
  if (tournamentId) { where.tournamentId = tournamentId; }
  return Match.findAll({
    where,
    order: [['scheduledTime', 'ASC']],
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'] },
      { model: Player, as: 'player2', attributes: ['id', 'name'] },
    ],
  });
}

module.exports = {
  startMatch, pauseMatch, resumeMatch,
  endMatch, cancelMatch, getMatchState, listMatches,
  validTransitions, validateTransition,
};
