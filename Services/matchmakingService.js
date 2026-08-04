const { Player, Match, Club, Tournament, Category, MatchEvent, TournamentClub } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { Op } = require('sequelize');

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

// ponytail: floor to nearest power of 2 — clean bracket, no BYEs
function prevPowerOf2(n) {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

// ponytail: resolve weight range — accepts direct min/max or looks up by name in settings
function resolveWeightRange(tournament, data) {
  if (data.minWeight !== undefined && data.maxWeight !== undefined) {
    return { min: parseFloat(data.minWeight), max: parseFloat(data.maxWeight) };
  }
  const genderClasses = tournament.settings?.weightClasses?.[data.gender] || [];
  const wc = genderClasses.find((w) => w.name === data.weightClass);
  if (!wc) {
    throw ApiErrors.badRequest(`Weight class "${data.weightClass}" not found in ${data.gender} division`);
  }
  return { min: parseFloat(wc.min), max: parseFloat(wc.max) };
}

// ponytail: generate full bracket tree — round 1 = Final, round N = first round
async function generateBracket(data) {
  const tournament = await Tournament.findByPk(data.tournamentId);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const range = resolveWeightRange(tournament, data);

  // ponytail: only players from registered clubs
  const registeredClubs = await TournamentClub.findAll({
    where: { tournamentId: data.tournamentId },
    attributes: ['clubId'],
    raw: true,
  });
  const registeredClubIds = registeredClubs.map((rc) => rc.clubId);

  const allPlayers = await Player.findAll({
    where: {
      tournamentId: data.tournamentId,
      gender: data.gender,
      weight: { [Op.between]: [range.min, range.max] },
      ...(registeredClubIds.length > 0 ? { clubId: registeredClubIds } : {}),
    },
    include: [{ model: Club, attributes: ['name'] }],
    order: [['name', 'ASC']],
  });

  if (allPlayers.length < 2) {
    return { matches: [], totalMatches: 0, warnings: [], reason: 'Insufficient players for bracket' };
  }

  // ponytail: trim to floor power of 2 — excess players excluded, no BYEs
  const bracketSize = prevPowerOf2(allPlayers.length);
  const players = allPlayers.slice(0, bracketSize);
  const excluded = allPlayers.slice(bracketSize);

  const warnings = [];
  for (const p of excluded) {
    warnings.push({ playerId: p.id, playerName: p.name, reason: 'excluded_bracket_trim' });
  }

  // ponytail: pair first round players with club avoidance
  const clubPercentages = calculateClubPercentages(players);
  const relaxAvoidance = Object.values(clubPercentages).some((pct) => pct > 0.5);
  const pairs = greedyMatch(players, clubPercentages, relaxAvoidance);

  const totalRounds = Math.log2(bracketSize);
  const matches = [];

  const baseTime = new Date();
  baseTime.setSeconds(0, 0);

  // ponytail: round naming — index 0 = FINAL, reversed numbering (1=Final)
  const roundNames = ['FINAL', 'SEMI_FINAL', 'QUARTER_FINAL', 'ROUND_OF_16', 'ROUND_OF_32'];

  // ponytail: create all rounds — round 1 = Final (fewest), round totalRounds = first round (most)
  const roundMatches = {};
  for (let round = totalRounds; round >= 1; round--) {
    const matchCount = bracketSize / Math.pow(2, totalRounds - round + 1);
    const roundName = roundNames[round - 1] || `ROUND_${round}`;
    roundMatches[round] = [];
    for (let pos = 0; pos < matchCount; pos++) {
      const match = await Match.create({
        tournamentId: data.tournamentId,
        categoryId: data.categoryId || null,
        type: data.matchType || 'SINGLE_ELIMINATION',
        player1Id: null,
        player2Id: null,
        scheduledTime: new Date(baseTime.getTime() + round * 3600000),
        status: 'SCHEDULED',
        bracketRound: round,
        weightClass: data.weightClass || `${range.min}-${range.max}kg`,
        stageName: roundName,
        bracketPosition: pos,
        hongScore: 0,
        chungScore: 0,
        scorePlayer1: 0,
        scorePlayer2: 0,
      });
      roundMatches[round].push(match);
    }
  }

  // ponytail: link matches — higher rounds (QF) feed into lower rounds (SF → Final)
  for (let round = totalRounds; round > 1; round--) {
    const currentRound = roundMatches[round];
    const nextRound = roundMatches[round - 1];
    for (let i = 0; i < currentRound.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      const slot = i % 2 === 0 ? 'PLAYER1' : 'PLAYER2';
      await currentRound[i].update({
        nextMatchId: nextRound[nextMatchIndex].id,
        nextMatchSlot: slot,
      });
    }
  }

  // ponytail: fill first round (highest round number) with paired players
  const firstRound = roundMatches[totalRounds];
  for (let i = 0; i < firstRound.length; i++) {
    const match = firstRound[i];
    if (i < pairs.length) {
      await match.update({
        player1Id: pairs[i].p1.id,
        player2Id: pairs[i].p2.id,
      });
      if (pairs[i].intraClub) {
        warnings.push({ matchId: match.id, reason: 'intra_club_match' });
      }
    }
  }

  matches.push(...Object.values(roundMatches).flat());

  return { matches, totalMatches: matches.length, warnings };
}

// ponytail: generate brackets for ALL categories in a tournament at once
async function generateAllBrackets(tournamentId) {
  const tournament = await Tournament.findByPk(tournamentId);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const categories = await Category.findAll({ where: { tournamentId } });
  const results = {};
  const allWarnings = [];
  let totalMatches = 0;

  for (const cat of categories) {
    const result = await generateBracket({
      tournamentId,
      gender: cat.gender,
      minWeight: cat.minWeight,
      maxWeight: cat.maxWeight,
      categoryId: cat.id,
    });
    results[cat.id] = {
      categoryName: cat.name,
      gender: cat.gender,
      ...result,
    };
    allWarnings.push(...(result.warnings || []));
    totalMatches += result.totalMatches;
  }

  return { categories: results, totalMatches, totalWarnings: allWarnings.length, warnings: allWarnings };
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

module.exports = { generateBracket, generateAllBrackets, getMatchDetail, calculateClubPercentages, greedyMatch, prevPowerOf2 };
