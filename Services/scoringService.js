const { Match, MatchEvent } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { MATCH_STATUS, MATCH_EVENT_TYPES } = require('../config/constants');

async function addPoint(matchId, playerId, points, roundNumber) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw ApiErrors.conflict('Cannot add points: match not in progress');
  }
  if (playerId !== match.player1Id && playerId !== match.player2Id) {
    throw ApiErrors.badRequest('Player is not in this match');
  }
  if (!Number.isInteger(points) || points <= 0) {
    throw ApiErrors.validation('Points must be a positive integer');
  }
  if (match.currentRound < 1 || match.currentRound > 3) {
    throw ApiErrors.conflict('Invalid round number');
  }

  if (playerId === match.player1Id) {
    match.scorePlayer1 += points;
  } else {
    match.scorePlayer2 += points;
  }

  const event = await MatchEvent.create({
    matchId: match.id,
    type: MATCH_EVENT_TYPES.ADD_POINT,
    playerId,
    points,
    roundNumber: match.currentRound,
  });

  const pointGap = Math.abs(match.scorePlayer1 - match.scorePlayer2);
  const tournament = await match.getTournament();
  const gapThreshold = tournament.settings?.pointGapAutoEnd || 20;

  let autoEnded = false;
  if (pointGap >= gapThreshold) {
    match.status = MATCH_STATUS.FINISHED;
    match.winnerId = match.scorePlayer1 > match.scorePlayer2 ? match.player1Id : match.player2Id;
    match.endTime = new Date();
    await MatchEvent.create({
      matchId: match.id,
      type: MATCH_EVENT_TYPES.AUTO_END_BY_GAP,
      playerId: null,
      points: null,
      roundNumber: match.currentRound,
      metadata: { pointGap, threshold: gapThreshold },
    });
    autoEnded = true;
  }

  await match.save();

  return {
    success: true,
    eventId: event.id,
    matchId: match.id,
    score: { player1: match.scorePlayer1, player2: match.scorePlayer2 },
    autoEnded,
    winnerId: autoEnded ? match.winnerId : null,
  };
}

async function removePoint(matchId, playerId, points, roundNumber) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw ApiErrors.conflict('Cannot remove points: match not in progress');
  }
  if (playerId !== match.player1Id && playerId !== match.player2Id) {
    throw ApiErrors.badRequest('Player is not in this match');
  }
  if (!Number.isInteger(points) || points <= 0) {
    throw ApiErrors.validation('Points must be a positive integer');
  }

  if (playerId === match.player1Id) {
    match.scorePlayer1 = Math.max(0, match.scorePlayer1 - points);
  } else {
    match.scorePlayer2 = Math.max(0, match.scorePlayer2 - points);
  }

  const event = await MatchEvent.create({
    matchId: match.id,
    type: MATCH_EVENT_TYPES.REMOVE_POINT,
    playerId,
    points,
    roundNumber: match.currentRound,
  });

  await match.save();

  return {
    success: true,
    eventId: event.id,
    matchId: match.id,
    score: { player1: match.scorePlayer1, player2: match.scorePlayer2 },
  };
}

async function endRound(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status !== MATCH_STATUS.IN_PROGRESS) {
    throw ApiErrors.conflict('Match is not in progress');
  }
  if (match.currentRound >= 3) {
    throw ApiErrors.conflict('All rounds have been completed');
  }

  match.currentRound += 1;
  await match.save();

  const event = await MatchEvent.create({
    matchId: match.id,
    type: MATCH_EVENT_TYPES.END_ROUND,
    points: null,
    roundNumber: match.currentRound - 1,
    metadata: { nextRound: match.currentRound },
  });

  return {
    success: true,
    eventId: event.id,
    matchId: match.id,
    currentRound: match.currentRound,
  };
}

module.exports = { addPoint, removePoint, endRound };

