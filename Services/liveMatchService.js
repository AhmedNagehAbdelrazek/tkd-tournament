const { Match, Player, Tournament, Club } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');

function shapePlayer(p) {
  if (!p) return null;
  return {
    id: String(p.id),
    name: p.name,
    clubName: p.Club?.name || null,
  };
}

function toLiveResponse(match, tournament) {
  return {
    id: String(match.id),
    player1: shapePlayer(match.player1),
    player2: shapePlayer(match.player2),
    winner: match.winner ? shapePlayer(match.winner) : null,
    nextMatchId: match.nextMatchId ? String(match.nextMatchId) : null,
    round: match.bracketRound || 1,
    currentRound: match.currentRound || 1,
    totalRounds: match.totalRounds || tournament?.settings?.maxRounds || 3,
    roundDurationSeconds: match.roundDurationSeconds || tournament?.settings?.roundDurationSec || 120,
    hongScore: match.hongScore || match.scorePlayer1 || 0,
    chungScore: match.chungScore || match.scorePlayer2 || 0,
    hongPenalties: match.hongPenalties || 0,
    chungPenalties: match.chungPenalties || 0,
    hongInjured: match.hongInjured || false,
    chungInjured: match.chungInjured || false,
    hongExcluded: match.hongExcluded || false,
    chungExcluded: match.chungExcluded || false,
    timerStartTime: match.timerStartTime || null,
    accumulatedPausedTime: match.accumulatedPausedTime || 0,
    status: match.status || 'SCHEDULED',
  };
}

async function getLiveMatch(matchId) {
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      { model: Tournament, attributes: ['id', 'settings'], required: false },
    ],
  });
  if (!match) throw ApiErrors.notFound('Match not found');
  return toLiveResponse(match, match.Tournament);
}

async function performAction(matchId, action) {
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      { model: Tournament, attributes: ['id', 'settings'], required: false },
    ],
  });
  if (!match) throw ApiErrors.notFound('Match not found');

  const now = Date.now();

  switch (action) {
    case 'START':
      match.status = 'IN_PROGRESS';
      match.currentRound = 1;
      match.timerStartTime = now;
      break;
    case 'PAUSE':
      if (match.timerStartTime) {
        match.accumulatedPausedTime += (now - match.timerStartTime);
      }
      match.timerStartTime = null;
      match.status = 'PAUSED';
      break;
    case 'RESUME':
      match.timerStartTime = now;
      match.status = 'IN_PROGRESS';
      break;
    case 'END_ROUND':
      if (match.timerStartTime) {
        match.accumulatedPausedTime += (now - match.timerStartTime);
      }
      match.timerStartTime = null;
      if (match.currentRound >= (match.totalRounds || 3)) {
        match.status = 'MATCH_END';
      } else {
        match.status = 'ROUND_END';
      }
      break;
    case 'START_NEXT_ROUND':
      match.currentRound += 1;
      match.timerStartTime = now;
      match.status = 'IN_PROGRESS';
      break;
    case 'END_MATCH': {
      if (match.timerStartTime) {
        match.accumulatedPausedTime += (now - match.timerStartTime);
      }
      match.timerStartTime = null;
      match.status = 'MATCH_END';
      match.endTime = new Date();
      const hongS = match.hongScore || match.scorePlayer1;
      const chungS = match.chungScore || match.scorePlayer2;
      if (hongS > chungS) {
        match.winnerId = match.player1Id;
      } else if (chungS > hongS) {
        match.winnerId = match.player2Id;
      }
      break;
    }
    case 'RESET':
      match.status = 'PRE_MATCH';
      match.currentRound = 1;
      match.hongScore = 0;
      match.chungScore = 0;
      match.scorePlayer1 = 0;
      match.scorePlayer2 = 0;
      match.hongPenalties = 0;
      match.chungPenalties = 0;
      match.hongInjured = false;
      match.chungInjured = false;
      match.hongExcluded = false;
      match.chungExcluded = false;
      match.timerStartTime = null;
      match.accumulatedPausedTime = 0;
      match.winnerId = null;
      match.endTime = null;
      break;
    default:
      throw ApiErrors.badRequest(`Unknown action: ${action}`);
  }

  await match.save();
  return toLiveResponse(match, match.Tournament);
}

async function addPoints(matchId, side, points) {
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      { model: Tournament, attributes: ['id', 'settings'], required: false },
    ],
  });
  if (!match) throw ApiErrors.notFound('Match not found');

  if (side === 'hong') {
    match.hongScore = (match.hongScore || match.scorePlayer1 || 0) + points;
    match.scorePlayer1 = match.hongScore;
  } else if (side === 'chung') {
    match.chungScore = (match.chungScore || match.scorePlayer2 || 0) + points;
    match.scorePlayer2 = match.chungScore;
  } else {
    throw ApiErrors.badRequest('Side must be "hong" or "chung"');
  }

  const gapThreshold = match.Tournament?.settings?.pointGapAutoEnd || 20;
  const pointGap = Math.abs((match.hongScore || 0) - (match.chungScore || 0));
  if (pointGap >= gapThreshold) {
    match.status = 'MATCH_END';
    match.endTime = new Date();
    if ((match.hongScore || 0) > (match.chungScore || 0)) {
      match.winnerId = match.player1Id;
    } else {
      match.winnerId = match.player2Id;
    }
  }

  await match.save();
  return toLiveResponse(match, match.Tournament);
}

async function undoPoints(matchId, side, points) {
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      { model: Tournament, attributes: ['id', 'settings'], required: false },
    ],
  });
  if (!match) throw ApiErrors.notFound('Match not found');

  if (side === 'hong') {
    match.hongScore = Math.max(0, (match.hongScore || match.scorePlayer1 || 0) - points);
    match.scorePlayer1 = match.hongScore;
  } else if (side === 'chung') {
    match.chungScore = Math.max(0, (match.chungScore || match.scorePlayer2 || 0) - points);
    match.scorePlayer2 = match.chungScore;
  } else {
    throw ApiErrors.badRequest('Side must be "hong" or "chung"');
  }

  await match.save();
  return toLiveResponse(match, match.Tournament);
}

async function addPenalty(matchId, side) {
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      { model: Tournament, attributes: ['id', 'settings'], required: false },
    ],
  });
  if (!match) throw ApiErrors.notFound('Match not found');

  if (side === 'hong') {
    match.hongPenalties = (match.hongPenalties || 0) + 1;
    match.chungScore = (match.chungScore || match.scorePlayer2 || 0) + 1;
    match.scorePlayer2 = match.chungScore;
  } else if (side === 'chung') {
    match.chungPenalties = (match.chungPenalties || 0) + 1;
    match.hongScore = (match.hongScore || match.scorePlayer1 || 0) + 1;
    match.scorePlayer1 = match.hongScore;
  } else {
    throw ApiErrors.badRequest('Side must be "hong" or "chung"');
  }

  await match.save();
  return toLiveResponse(match, match.Tournament);
}

async function setInjury(matchId, side, isInjured) {
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      { model: Tournament, attributes: ['id', 'settings'], required: false },
    ],
  });
  if (!match) throw ApiErrors.notFound('Match not found');

  if (side === 'hong') {
    match.hongInjured = isInjured;
  } else if (side === 'chung') {
    match.chungInjured = isInjured;
  } else {
    throw ApiErrors.badRequest('Side must be "hong" or "chung"');
  }

  await match.save();
  return toLiveResponse(match, match.Tournament);
}

async function excludePlayer(matchId, side, reason) {
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      { model: Tournament, attributes: ['id', 'settings'], required: false },
    ],
  });
  if (!match) throw ApiErrors.notFound('Match not found');

  if (side === 'hong') {
    match.hongExcluded = true;
    match.winnerId = match.player2Id;
  } else if (side === 'chung') {
    match.chungExcluded = true;
    match.winnerId = match.player1Id;
  } else {
    throw ApiErrors.badRequest('Side must be "hong" or "chung"');
  }

  match.status = 'MATCH_END';
  match.endTime = new Date();
  if (reason) match.endReason = 'DISQUALIFICATION';
  await match.save();

  return toLiveResponse(match, match.Tournament);
}

async function getSuggestions(matchId) {
  const currentMatch = await Match.findByPk(matchId, {
    include: [{ model: Tournament, attributes: ['id', 'settings'], required: false }],
  });
  if (!currentMatch) throw ApiErrors.notFound('Match not found');

  const suggestions = await Match.findAll({
    where: {
      tournamentId: currentMatch.tournamentId,
      status: 'SCHEDULED',
      id: { [require('sequelize').Op.ne]: matchId },
    },
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Tournament, attributes: ['id', 'name'], required: false },
    ],
    order: [['scheduledTime', 'ASC']],
    limit: 5,
  });

  return suggestions.map((m, i) => ({
    id: String(m.id),
    categoryName: m.weightClass || null,
    tournamentName: m.Tournament?.name || null,
    player1: shapePlayer(m.player1),
    player2: shapePlayer(m.player2),
    scheduledAt: m.scheduledTime,
    priority: i + 1,
  }));
}

module.exports = { getLiveMatch, performAction, addPoints, undoPoints, addPenalty, setInjury, excludePlayer, getSuggestions };
