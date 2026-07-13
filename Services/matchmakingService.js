const { Player, Match, Club, Tournament, MatchEvent } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { MATCH_STATUS, MATCH_TYPES } = require('../config/constants');

function calculateClubPercentages(players) {
  const counts = {};
  players.forEach((p) => {
    counts[p.clubId] = (counts[p.clubId] || 0) + 1;
  });
  const total = players.length;
  const result = {};
  for (const [clubId, count] of Object.entries(counts)) {
    result[clubId] = count / total;
  }
  return result;
}

function greedyMatch(players, clubPercentages, relaxAvoidance) {
  const matches = [];
  const used = new Set();

  const sorted = [...players].sort((a, b) => {
    const pctA = clubPercentages[a.clubId] || 0;
    const pctB = clubPercentages[b.clubId] || 0;
    return pctB - pctA;
  });

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    let paired = false;

    if (!relaxAvoidance) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;
        if (sorted[i].clubId !== sorted[j].clubId) {
          matches.push({ p1: sorted[i], p2: sorted[j], intraClub: false });
          used.add(i);
          used.add(j);
          paired = true;
          break;
        }
      }
    }

    if (!paired) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;
        matches.push({
          p1: sorted[i],
          p2: sorted[j],
          intraClub: sorted[i].clubId === sorted[j].clubId,
        });
        used.add(i);
        used.add(j);
        paired = true;
        break;
      }
    }
  }

  return matches;
}

async function generateBracket(data) {
  const tournament = await Tournament.findByPk(data.tournamentId);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const weightClass = (tournament.settings?.weightClasses || []).find(
    (wc) => wc.name === data.weightClass
  );
  if (!weightClass) {
    throw ApiErrors.badRequest(`Weight class "${data.weightClass}" not found in tournament settings`);
  }

  const players = await Player.findAll({
    where: {
      tournamentId: data.tournamentId,
      gender: data.gender,
      weight: { [require('sequelize').Op.between]: [weightClass.min, weightClass.max] },
    },
    include: [{ model: Club, attributes: ['name'] }],
    order: [['name', 'ASC']],
  });

  if (players.length < 2) {
    return { matches: [], totalMatches: 0, warnings: [], reason: 'Insufficient players for bracket' };
  }

  const clubPercentages = calculateClubPercentages(players);
  const relaxAvoidance = Object.values(clubPercentages).some((pct) => pct > 0.5);

  const pairs = greedyMatch(players, clubPercentages, relaxAvoidance);

  const warnings = [];
  const matches = [];

  const baseTime = new Date();
  baseTime.setSeconds(0, 0);

  for (let i = 0; i < pairs.length; i++) {
    const { p1, p2, intraClub } = pairs[i];
    const scheduledTime = new Date(baseTime.getTime() + i * 15 * 60 * 1000);

    const match = await Match.create({
      tournamentId: data.tournamentId,
      type: data.matchType || MATCH_TYPES.SINGLE_ELIMINATION,
      player1Id: p1.id,
      player2Id: p2.id,
      scheduledTime,
      status: MATCH_STATUS.SCHEDULED,
      intraClubWarning: intraClub,
      bracketRound: 1,
      weightClass: data.weightClass,
    });

    if (intraClub) {
      warnings.push({ matchId: match.id, reason: 'intra_club_match' });
    }

    matches.push({
      id: match.id,
      player1Id: p1.id,
      player1Name: p1.name,
      player2Id: p2.id,
      player2Name: p2.name,
      scheduledTime,
      intraClubWarning: intraClub,
      bracketRound: 1,
    });
  }

  return { matches, totalMatches: matches.length, warnings };
}

async function getMatchDetail(id) {
  const match = await Match.findByPk(id, {
    include: [
      { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
      { model: MatchEvent, order: [['createdat', 'ASC']] },
    ],
  });
  if (!match) {
    throw ApiErrors.notFound('Match not found');
  }
  return match;
}

module.exports = { generateBracket, getMatchDetail, calculateClubPercentages, greedyMatch };
