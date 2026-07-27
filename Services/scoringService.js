const { Match, MatchEvent } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');

async function addPoint(matchId, playerId, points, roundNumber) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status !== 'IN_PROGRESS') {
    throw ApiErrors.conflict('Cannot add points: match not in progress');
  }
  if (playerId !== match.player1Id && playerId !== match.player2Id) {
    throw ApiErrors.badRequest('Player is not in this match');
  }
  if (!Number.isInteger(points) || points <= 0) {
    throw ApiErrors.validation('Points must be a positive integer');
  }

  if (playerId === match.player1Id) {
    match.hongScore = (match.hongScore || match.scorePlayer1 || 0) + points;
    match.scorePlayer1 = match.hongScore;
  } else {
    match.chungScore = (match.chungScore || match.scorePlayer2 || 0) + points;
    match.scorePlayer2 = match.chungScore;
  }

  const event = await MatchEvent.create({
    matchId: match.id,
    type: 'ADD_POINT',
    playerId,
    points,
    roundNumber: match.currentRound,
  });

  const pointGap = Math.abs((match.hongScore || 0) - (match.chungScore || 0));
  const tournament = await match.getTournament();
  const gapThreshold = tournament.settings?.pointGapAutoEnd || 20;

  let autoEnded = false;
  if (pointGap >= gapThreshold) {
    match.status = 'MATCH_END';
    match.winnerId = (match.hongScore || 0) > (match.chungScore || 0) ? match.player1Id : match.player2Id;
    match.endTime = new Date();
    await MatchEvent.create({
      matchId: match.id,
      type: 'AUTO_END_BY_GAP',
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
    matchId: String(match.id),
    score: { hong: match.hongScore || match.scorePlayer1, chung: match.chungScore || match.scorePlayer2 },
    autoEnded,
    winnerId: autoEnded ? String(match.winnerId) : null,
  };
}

async function removePoint(matchId, playerId, points, roundNumber) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status !== 'IN_PROGRESS') {
    throw ApiErrors.conflict('Cannot remove points: match not in progress');
  }
  if (playerId !== match.player1Id && playerId !== match.player2Id) {
    throw ApiErrors.badRequest('Player is not in this match');
  }
  if (!Number.isInteger(points) || points <= 0) {
    throw ApiErrors.validation('Points must be a positive integer');
  }

  if (playerId === match.player1Id) {
    match.hongScore = Math.max(0, (match.hongScore || match.scorePlayer1 || 0) - points);
    match.scorePlayer1 = match.hongScore;
  } else {
    match.chungScore = Math.max(0, (match.chungScore || match.scorePlayer2 || 0) - points);
    match.scorePlayer2 = match.chungScore;
  }

  const event = await MatchEvent.create({
    matchId: match.id,
    type: 'REMOVE_POINT',
    playerId,
    points,
    roundNumber: match.currentRound,
  });

  await match.save();

  return {
    success: true,
    eventId: event.id,
    matchId: String(match.id),
    score: { hong: match.hongScore || match.scorePlayer1, chung: match.chungScore || match.scorePlayer2 },
  };
}

async function endRound(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status !== 'IN_PROGRESS') {
    throw ApiErrors.conflict('Match is not in progress');
  }
  if (match.currentRound >= (match.totalRounds || 3)) {
    throw ApiErrors.conflict('All rounds have been completed');
  }

  match.currentRound += 1;
  match.status = 'ROUND_END';
  await match.save();

  const event = await MatchEvent.create({
    matchId: match.id,
    type: 'END_ROUND',
    points: null,
    roundNumber: match.currentRound - 1,
    metadata: { nextRound: match.currentRound },
  });

  return {
    success: true,
    eventId: event.id,
    matchId: String(match.id),
    currentRound: match.currentRound,
  };
}

module.exports = { addPoint, removePoint, endRound };

