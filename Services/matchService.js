const { Match, Player, MatchEvent, Tournament } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { MATCH_STATUS, MATCH_EVENT_TYPES, END_REASONS, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../config/constants');
const { progressWinner } = require('./bracketService');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit } = require('../Services/auditService');
const { Op } = require('sequelize');

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

async function checkConflictWindow(tournamentId, player1Id, player2Id, scheduledTime, excludeMatchId = null) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const roundDurationSec = tournament.settings?.roundDurationSec || 120;
  const maxRounds = tournament.settings?.maxRounds || 3;
  const conflictWindowSec = roundDurationSec * maxRounds;
  const scheduledDate = new Date(scheduledTime);
  const windowStart = new Date(scheduledDate.getTime() - conflictWindowSec * 1000);
  const windowEnd = new Date(scheduledDate.getTime() + conflictWindowSec * 1000);

  const playerIds = [player1Id, player2Id];
  const where = {
    tournamentId,
    status: { [Op.in]: [MATCH_STATUS.SCHEDULED, MATCH_STATUS.IN_PROGRESS] },
    scheduledTime: { [Op.between]: [windowStart, windowEnd] },
    [Op.or]: [
      { player1Id: { [Op.in]: playerIds } },
      { player2Id: { [Op.in]: playerIds } },
    ],
  };
  if (excludeMatchId) {
    where.id = { [Op.ne]: excludeMatchId };
  }

  const conflicts = await Match.findAll({ where });
  return conflicts;
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

async function endMatch(matchId, winnerId, endReason) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  validateTransition(match.status, MATCH_STATUS.FINISHED);
  if (winnerId && winnerId !== match.player1Id && winnerId !== match.player2Id) {
    throw ApiErrors.badRequest('Winner must be one of the match players');
  }
  match.status = MATCH_STATUS.FINISHED;
  match.winnerId = winnerId || null;
  match.endTime = new Date();
  if (endReason) match.endReason = endReason;
  await match.save();
  await MatchEvent.create({
    matchId: match.id,
    type: MATCH_EVENT_TYPES.FINISHED,
    roundNumber: match.currentRound,
    metadata: {
      winner: winnerId,
      endReason,
      finalScore: { player1: match.scorePlayer1, player2: match.scorePlayer2 }
    }
  });

  let progression = null;
  try {
    progression = await progressWinner(match.id);
  } catch (err) {
    console.error('Progression error for match', matchId, err.message);
  }

  return {
    id: match.id, tournamentId: match.tournamentId, status: match.status,
    winnerId: match.winnerId, endTime: match.endTime,
    weightClass: match.weightClass,
    finalScore: { player1: match.scorePlayer1, player2: match.scorePlayer2 },
    progression
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

async function list(query = {}) {
  const { page, limit, offset } = parsePagination(query);
  const where = {};

  if (query.tournamentId) {
    where.tournamentId = query.tournamentId;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.weightClass) {
    where.weightClass = query.weightClass;
  }
  if (query.bracketRound) {
    where.bracketRound = query.bracketRound;
  }

  const { rows, count } = await Match.findAndCountAll({
    where,
    order: [['scheduledTime', 'ASC']],
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'] },
      { model: Player, as: 'player2', attributes: ['id', 'name'] },
    ],
    limit,
    offset,
  });

  const meta = buildPaginationMeta(count, page, limit);
  return { data: rows, meta };
}

async function schedule(data, actorId) {
  const { tournamentId, player1Id, player2Id, scheduledTime, type, weightClass } = data;

  if (player1Id === player2Id) {
    throw ApiErrors.badRequest('Players must be different');
  }

  const player1 = await Player.findByPk(player1Id);
  if (!player1 || player1.tournamentId !== tournamentId) {
    throw ApiErrors.badRequest('Player 1 not found in this tournament');
  }
  const player2 = await Player.findByPk(player2Id);
  if (!player2 || player2.tournamentId !== tournamentId) {
    throw ApiErrors.badRequest('Player 2 not found in this tournament');
  }

  const conflicts = await checkConflictWindow(tournamentId, player1Id, player2Id, scheduledTime);
  if (conflicts.length > 0) {
    throw ApiErrors.conflict('Player has a scheduling conflict within the conflict window');
  }

  const match = await Match.create({
    tournamentId,
    player1Id,
    player2Id,
    scheduledTime: new Date(scheduledTime),
    type: type || 'FRIENDLY',
    weightClass: weightClass || null,
    status: MATCH_STATUS.SCHEDULED,
  });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.SCHEDULE_MATCH,
      entityType: AUDIT_ENTITY_TYPES.MATCH,
      entityId: match.id,
      metadata: { tournamentId, player1Id, player2Id, scheduledTime, type },
    });
  }

  return getMatchState(match.id);
}

async function reschedule(id, scheduledTime, actorId) {
  const match = await Match.findByPk(id);
  if (!match) {
    throw ApiErrors.notFound('Match not found');
  }
  validateTransition(match.status, MATCH_STATUS.SCHEDULED);

  const conflicts = await checkConflictWindow(
    match.tournamentId,
    match.player1Id,
    match.player2Id,
    scheduledTime,
    match.id
  );
  if (conflicts.length > 0) {
    throw ApiErrors.conflict('Player has a scheduling conflict within the conflict window');
  }

  const previousTime = match.scheduledTime;
  await match.update({ scheduledTime: new Date(scheduledTime) });

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.RESCHEDULE_MATCH,
      entityType: AUDIT_ENTITY_TYPES.MATCH,
      entityId: match.id,
      metadata: { previousTime, newTime: scheduledTime },
    });
  }

  return getMatchState(id);
}

async function walkover(id, winnerId, actorId) {
  const match = await Match.findByPk(id);
  if (!match) {
    throw ApiErrors.notFound('Match not found');
  }

  if (match.status !== MATCH_STATUS.SCHEDULED && match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw ApiErrors.badRequest('Walkover can only be assigned to scheduled or in-progress matches');
  }

  if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
    throw ApiErrors.badRequest('Winner must be one of the match players');
  }

  return endMatch(id, winnerId, END_REASONS.WALKOVER);
}

module.exports = {
  startMatch, pauseMatch, resumeMatch,
  endMatch, cancelMatch, getMatchState, list,
  schedule, reschedule, walkover,
  validTransitions, validateTransition,
};
