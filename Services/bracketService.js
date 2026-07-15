const { Match, Player, Club, Tournament, MatchEvent } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { MATCH_STATUS, MATCH_EVENT_TYPES, END_REASONS } = require('../config/constants');
const { Op } = require('sequelize');

async function progressWinner(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status !== MATCH_STATUS.FINISHED) throw ApiErrors.conflict('Match must be FINISHED to progress winner');
  if (match.status === MATCH_STATUS.CANCELLED) return null;

  if (!match.nextMatchId) return null;

  const nextMatch = await Match.findByPk(match.nextMatchId);
  if (!nextMatch) throw ApiErrors.notFound('Next match not found');

  if (match.nextMatchSlot === 'PLAYER1') {
    nextMatch.player1Id = match.winnerId;
  } else if (match.nextMatchSlot === 'PLAYER2') {
    nextMatch.player2Id = match.winnerId;
  }

  await nextMatch.save();

  return { nextMatchId: nextMatch.id, slot: match.nextMatchSlot, winnerId: match.winnerId };
}

async function buildBracketTree(tournamentId, weightClass, gender) {
  const where = { tournamentId };
  if (weightClass) where.weightClass = weightClass;
  if (gender) {
    const matches = await Match.findAll({
      where,
      include: [
        { model: Player, as: 'player1', attributes: ['id', 'name'] },
        { model: Player, as: 'player2', attributes: ['id', 'name'] },
        { model: Player, as: 'winner', attributes: ['id', 'name'] },
      ],
      order: [['bracketPosition', 'ASC']],
    });

    const genderMap = {};
    for (const match of matches) {
      const p1 = match.player1;
      const p2 = match.player2;
      let matchGender = gender;
      if (p1) matchGender = 'MALE';
      else if (p2) matchGender = 'FEMALE';
      else matchGender = gender;
      if (!genderMap[matchGender]) genderMap[matchGender] = [];
      genderMap[matchGender].push(match);
    }

    if (!genderMap[gender]) return null;

    const filtered = genderMap[gender];
    return buildTreeFromMatches(filtered);
  }

  const matches = await Match.findAll({
    where,
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'] },
      { model: Player, as: 'player2', attributes: ['id', 'name'] },
      { model: Player, as: 'winner', attributes: ['id', 'name'] },
    ],
    order: [['bracketPosition', 'ASC']],
  });

  return buildTreeFromMatches(matches);
}

function buildTreeFromMatches(matches) {
  if (!matches || matches.length === 0) return null;

  const map = {};
  for (const m of matches) {
    map[m.id] = serializeMatch(m);
  }

  let root = null;
  for (const m of matches) {
    if (m.nextMatchId && map[m.nextMatchId]) {
      const slot = m.nextMatchSlot;
      if (slot === 'PLAYER1') {
        map[m.nextMatchId].player1Source = map[m.id];
      } else if (slot === 'PLAYER2') {
        map[m.nextMatchId].player2Source = map[m.id];
      }
    } else if (!m.nextMatchId) {
      root = map[m.id];
    }
  }

  return root || null;
}

function serializeMatch(m) {
  const obj = {
    id: m.id,
    stageName: m.stageName,
    status: m.status,
    bracketPosition: m.bracketPosition,
  };
  if (m.player1) {
    obj.player1 = { id: m.player1.id, name: m.player1.name };
  }
  if (m.player2) {
    obj.player2 = { id: m.player2.id, name: m.player2.name };
  }
  if (m.winnerId) obj.winnerId = m.winnerId;
  if (m.winner) {
    obj.winner = { id: m.winner.id, name: m.winner.name };
  }
  return obj;
}

function determineCurrentStage(matches) {
  if (!matches || matches.length === 0) return null;

  const stageOrder = [];
  const stageSet = new Set();
  for (const m of matches) {
    if (!stageSet.has(m.stageName)) {
      stageSet.add(m.stageName);
      stageOrder.push(m.stageName);
    }
  }

  let currentStage = null;
  for (const stage of stageOrder) {
    const stageMatches = matches.filter((m) => m.stageName === stage);
    const hasActive = stageMatches.some(
      (m) => m.status === MATCH_STATUS.IN_PROGRESS || m.status === MATCH_STATUS.SCHEDULED
    );
    if (hasActive) currentStage = stage;
  }

  return currentStage;
}

async function overrideNextMatchSlot(matchId, playerId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status === MATCH_STATUS.FINISHED) {
    throw ApiErrors.conflict('Cannot override: target match is already finished');
  }
  if (!match.nextMatchId) {
    throw ApiErrors.badRequest('Match has no next match to override');
  }

  const nextMatch = await Match.findByPk(match.nextMatchId);
  if (!nextMatch) throw ApiErrors.notFound('Next match not found');

  if (match.nextMatchSlot === 'PLAYER1') {
    nextMatch.player1Id = playerId;
  } else if (match.nextMatchSlot === 'PLAYER2') {
    nextMatch.player2Id = playerId;
  }

  await nextMatch.save();

  return { nextMatchId: nextMatch.id, slot: match.nextMatchSlot, playerId };
}

module.exports = {
  progressWinner,
  buildBracketTree,
  buildTreeFromMatches,
  determineCurrentStage,
  overrideNextMatchSlot,
  serializeMatch,
};
