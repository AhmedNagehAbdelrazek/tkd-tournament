const { Match, Player, Club, Tournament, MatchEvent } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { Op } = require('sequelize');

async function progressWinner(matchId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status !== 'FINISHED') throw ApiErrors.conflict('Match must be FINISHED to progress winner');
  if (match.status === 'CANCELLED') return null;

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

// ponytail: parse weight class name from tournament settings, or parse "min-max" range
function resolveWeightRange(tournament, weightClass, gender) {
  if (!tournament?.settings?.weightClasses) return null;

  // try exact name match in gender-specific classes
  const genderClasses = tournament.settings.weightClasses[gender] || [];
  const found = genderClasses.find((wc) => wc.name === weightClass);
  if (found) return { min: found.min, max: found.max };

  // ponytail: try all genders if no match in specified gender
  for (const g of Object.values(tournament.settings.weightClasses)) {
    const hit = (g || []).find((wc) => wc.name === weightClass);
    if (hit) return { min: hit.min, max: hit.max };
  }

  // ponytail: parse "min-max" or "min-maxkg" format
  const m = weightClass.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };

  return null;
}

async function buildBracketTree(tournamentId, weightClass, gender) {
  const tournament = await Tournament.findByPk(tournamentId);
  const range = weightClass ? resolveWeightRange(tournament, weightClass, gender) : null;

  // ponytail: always join players so we can filter by weight range and gender
  const where = { tournamentId };
  const matches = await Match.findAll({
    where,
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name', 'weight', 'gender'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name', 'weight', 'gender'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'] },
    ],
    order: [['bracketPosition', 'ASC']],
  });

  // ponytail: filter by weight range and/or gender in JS — simpler than subquery, few hundred matches max
  const filtered = matches.filter((m) => {
    const p1 = m.player1;
    const p2 = m.player2;
    const players = [p1, p2].filter(Boolean);

    // ponytail: strictly enforce same gender — ALL players must match
    if (gender) {
      if (!players.every((p) => p.gender === gender)) return false;
    }

    if (range) {
      if (!players.some((p) => p.weight >= range.min && p.weight <= range.max)) return false;
    }

    return true;
  });

  if (filtered.length === 0) return null;
  return buildBracketRounds(filtered);
}

// ponytail: build all brackets for a tournament, grouped by gender and weight class
async function buildAllBrackets(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) throw ApiErrors.notFound('Tournament not found');

  const weightClasses = tournament.settings?.weightClasses || {};
  const allMatches = await Match.findAll({
    where: { tournamentId },
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name', 'weight', 'gender'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name', 'weight', 'gender'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'winner', attributes: ['id', 'name'] },
    ],
    order: [['bracketPosition', 'ASC']],
  });

  if (allMatches.length === 0) {
    return { tournamentId, brackets: {}, currentRound: null };
  }

  const brackets = {};
  for (const [gender, classes] of Object.entries(weightClasses)) {
    if (!Array.isArray(classes)) continue;
    for (const wc of classes) {
      const range = { min: wc.min, max: wc.max };
      const filtered = allMatches.filter((m) => {
        const players = [m.player1, m.player2].filter(Boolean);
        // ponytail: strictly enforce same gender — ALL players must match
        return players.every((p) => p.gender === gender) &&
               players.some((p) => p.weight >= range.min && p.weight <= range.max);
      });
      if (filtered.length > 0) {
        if (!brackets[gender]) brackets[gender] = {};
        brackets[gender][wc.name] = buildBracketRounds(filtered);
      }
    }
  }

  const currentRound = determineCurrentRound(allMatches);
  return { tournamentId, brackets, currentRound };
}

function buildBracketRounds(matches) {
  if (!matches || matches.length === 0) return null;

  const rounds = {};
  for (const m of matches) {
    const round = m.bracketRound || 1;
    const key = `Round ${round}`;
    if (!rounds[key]) rounds[key] = [];
    rounds[key].push(serializeMatch(m));
  }

  const sortedKeys = Object.keys(rounds).sort((a, b) => {
    const numA = parseInt(a.replace('Round ', ''), 10);
    const numB = parseInt(b.replace('Round ', ''), 10);
    return numA - numB;
  });

  const bracket = {};
  for (const key of sortedKeys) {
    bracket[key] = rounds[key];
  }

  const totalRounds = sortedKeys.length;
  return { bracket, totalRounds };
}

function serializeMatch(m) {
  const obj = {
    id: m.id,
    status: m.status,
  };

  if (m.player1) {
    obj.player1 = { name: m.player1.name };
  } else {
    obj.player1 = null;
  }

  if (m.player2) {
    obj.player2 = { name: m.player2.name };
  } else {
    obj.player2 = null;
  }

  if (m.winnerId) obj.winnerId = m.winnerId;
  if (m.scorePlayer1 !== undefined) obj.scorePlayer1 = m.scorePlayer1;
  if (m.scorePlayer2 !== undefined) obj.scorePlayer2 = m.scorePlayer2;

  if (m.endReason === 'BYE') {
    obj.isBye = true;
    obj.endReason = 'BYE';
  }

  return obj;
}

function determineCurrentRound(matches) {
  if (!matches || matches.length === 0) return null;

  let currentRound = null;
  for (const m of matches) {
    const round = m.bracketRound || 1;
    const hasActive = m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED';
    if (hasActive) {
      if (!currentRound || round > currentRound) currentRound = round;
    }
  }

  return currentRound;
}

async function overrideNextMatchSlot(matchId, playerId) {
  const match = await Match.findByPk(matchId);
  if (!match) throw ApiErrors.notFound('Match not found');
  if (match.status === 'FINISHED') {
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
  buildAllBrackets,
  buildBracketRounds,
  determineCurrentRound,
  overrideNextMatchSlot,
  serializeMatch,
};
