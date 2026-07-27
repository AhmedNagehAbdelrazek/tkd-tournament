const { Match, Player, MatchEvent, Tournament, Club } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { progressWinner } = require('./bracketService');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { logAudit } = require('../Services/auditService');
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../config/constants');
const { Op } = require('sequelize');

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
    status: { [Op.in]: ['SCHEDULED', 'IN_PROGRESS'] },
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
  match.status = 'IN_PROGRESS';
  match.currentRound = 1;
  match.timerStartTime = Date.now();
  match.hongScore = 0;
  match.chungScore = 0;
  match.scorePlayer1 = 0;
  match.scorePlayer2 = 0;
  await match.save();
  await MatchEvent.create({ matchId: match.id, type: 'START', roundNumber: 1 });
  return { id: String(match.id), status: match.status, startedAt: new Date(), currentRound: match.currentRound };
}

async function pauseMatch(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.timerStartTime) {
    match.accumulatedPausedTime += (Date.now() - match.timerStartTime);
  }
  match.timerStartTime = null;
  match.status = 'PAUSED';
  await match.save();
  await MatchEvent.create({ matchId: match.id, type: 'PAUSE', roundNumber: match.currentRound });
  return { id: String(match.id), status: match.status, pausedAt: new Date() };
}

async function resumeMatch(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  match.timerStartTime = Date.now();
  match.status = 'IN_PROGRESS';
  await match.save();
  await MatchEvent.create({ matchId: match.id, type: 'RESUME', roundNumber: match.currentRound });
  return { id: String(match.id), status: match.status, resumedAt: new Date() };
}

async function endMatch(matchId, winnerId, endReason) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');

  if (match.timerStartTime) {
    match.accumulatedPausedTime += (Date.now() - match.timerStartTime);
  }
  match.timerStartTime = null;

  if (winnerId && winnerId !== match.player1Id && winnerId !== match.player2Id) {
    throw ApiErrors.badRequest('Winner must be one of the match players');
  }

  if (!winnerId) {
    const hongS = match.hongScore || match.scorePlayer1 || 0;
    const chungS = match.chungScore || match.scorePlayer2 || 0;
    if (hongS > chungS) winnerId = match.player1Id;
    else if (chungS > hongS) winnerId = match.player2Id;
  }

  match.status = 'MATCH_END';
  match.winnerId = winnerId || null;
  match.endTime = new Date();
  if (endReason) match.endReason = endReason;
  await match.save();
  await MatchEvent.create({
    matchId: match.id,
    type: 'FINISHED',
    roundNumber: match.currentRound,
    metadata: {
      winner: winnerId,
      endReason,
      finalScore: { hong: match.hongScore || match.scorePlayer1, chung: match.chungScore || match.scorePlayer2 }
    }
  });

  let progression = null;
  try {
    progression = await progressWinner(match.id);
  } catch (err) {
    console.error('Progression error for match', matchId, err.message);
  }

  return {
    id: String(match.id), tournamentId: match.tournamentId, status: match.status,
    winnerId: match.winnerId ? String(match.winnerId) : null, endTime: match.endTime,
    weightClass: match.weightClass,
    finalScore: { hong: match.hongScore || match.scorePlayer1, chung: match.chungScore || match.scorePlayer2 },
    progression
  };
}

async function cancelMatch(matchId, cancelledByRole) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status === 'IN_PROGRESS' && cancelledByRole !== 'ADMIN')
    throw ApiErrors.forbidden('Only Admins can cancel ongoing matches');
  if (match.status === 'SCHEDULED' && cancelledByRole === 'SCOREKEEPER')
    throw ApiErrors.forbidden('Scorekeepers cannot cancel matches');
  match.status = 'CANCELLED';
  await match.save();
  await MatchEvent.create({ matchId: match.id, type: 'CANCEL', roundNumber: match.currentRound });
  return { id: String(match.id), status: match.status, cancelledAt: new Date() };
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

  return {
    id: String(match.id),
    status: match.status,
    player1: match.player1 ? { id: String(match.player1.id), name: match.player1.name } : null,
    player2: match.player2 ? { id: String(match.player2.id), name: match.player2.name } : null,
    winnerId: match.winnerId ? String(match.winnerId) : null,
    score: { player1: match.scorePlayer1 || match.hongScore || 0, player2: match.scorePlayer2 || match.chungScore || 0 },
    currentRound: match.currentRound,
    scheduledTime: match.scheduledTime,
  };
}

async function list(query = {}) {
  const { page, limit, offset, pageSize } = parsePagination(query);
  const where = {};

  if (query.tournamentId) {
    where.tournamentId = query.tournamentId;
  }
  if (query.status) {
    const statusMap = { PENDING: 'SCHEDULED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'FINISHED' };
    where.status = statusMap[query.status] || query.status;
  }
  if (query.weightClass) {
    where.weightClass = query.weightClass;
  }
  if (query.bracketRound || query.round) {
    where.bracketRound = query.bracketRound || query.round;
  }
  if (query.startDate || query.endDate) {
    where.scheduledTime = {};
    if (query.startDate) where.scheduledTime[Op.gte] = new Date(query.startDate);
    if (query.endDate) where.scheduledTime[Op.lte] = new Date(query.endDate);
  }

  const playerInclude = [
    { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
    { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
  ];

  if (query.playerSearch) {
    playerInclude[0].where = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${query.playerSearch}%` } },
      ],
    };
  }

  const { rows, count } = await Match.findAndCountAll({
    where,
    order: [['scheduledTime', 'ASC']],
    include: [
      ...playerInclude,
      { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      { model: Tournament, attributes: ['id', 'name'], required: false },
    ],
    limit,
    offset,
  });

  const data = rows.map(m => {
    const statusMapReverse = { SCHEDULED: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', FINISHED: 'COMPLETED' };
    return {
      id: String(m.id),
      tournamentId: String(m.tournamentId),
      tournamentName: m.Tournament?.name || null,
      categoryName: m.weightClass || null,
      round: m.bracketRound || 1,
      player1: m.player1 ? { id: String(m.player1.id), name: m.player1.name, clubName: m.player1.Club?.name || null } : null,
      player2: m.player2 ? { id: String(m.player2.id), name: m.player2.name, clubName: m.player2.Club?.name || null } : null,
      winner: m.winner ? { id: String(m.winner.id), name: m.winner.name } : null,
      status: statusMapReverse[m.status] || m.status,
      scheduledAt: m.scheduledTime,
    };
  });

  return buildPaginatedResponse(data, count, page, pageSize);
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
    status: 'SCHEDULED',
    hongScore: 0,
    chungScore: 0,
    scorePlayer1: 0,
    scorePlayer2: 0,
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
  if (match.status !== 'SCHEDULED') {
    throw ApiErrors.conflict('Can only reschedule SCHEDULED matches');
  }

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

  if (match.status !== 'SCHEDULED' && match.status !== 'IN_PROGRESS') {
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
};
