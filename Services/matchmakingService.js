const { Player, Match, Club, Tournament, MatchEvent, TournamentClub } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');

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

// ponytail: next power of 2 for bracket sizing
function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// ponytail: generate full bracket tree with all rounds and BYE support
async function generateBracket(data) {
  const tournament = await Tournament.findByPk(data.tournamentId);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const genderClasses = tournament.settings?.weightClasses?.[data.gender] || [];
  const weightClass = genderClasses.find((wc) => wc.name === data.weightClass);
  if (!weightClass) {
    throw ApiErrors.badRequest(`Weight class "${data.weightClass}" not found in ${data.gender} division`);
  }

  // ponytail: only players from registered clubs
  const registeredClubs = await TournamentClub.findAll({
    where: { tournamentId: data.tournamentId },
    attributes: ['clubId'],
    raw: true,
  });
  const registeredClubIds = registeredClubs.map((rc) => rc.clubId);

  const players = await Player.findAll({
    where: {
      tournamentId: data.tournamentId,
      gender: data.gender,
      weight: { [require('sequelize').Op.between]: [weightClass.min, weightClass.max] },
      ...(registeredClubIds.length > 0 ? { clubId: registeredClubIds } : {}),
    },
    include: [{ model: Club, attributes: ['name'] }],
    order: [['name', 'ASC']],
  });

  if (players.length < 2) {
    return { matches: [], totalMatches: 0, warnings: [], reason: 'Insufficient players for bracket' };
  }

  // ponytail: pair first round players
  const clubPercentages = calculateClubPercentages(players);
  const relaxAvoidance = Object.values(clubPercentages).some((pct) => pct > 0.5);
  const pairs = greedyMatch(players, clubPercentages, relaxAvoidance);

  // ponytail: calculate bracket structure
  const firstRoundCount = nextPowerOf2(players.length);
  const totalRounds = Math.log2(firstRoundCount);
  const warnings = [];
  const matches = [];

  const baseTime = new Date();
  baseTime.setSeconds(0, 0);

  // ponytail: create all rounds (from final backwards)
  const roundNames = ['FINAL', 'SEMI_FINAL', 'QUARTER_FINAL', 'ROUND_OF_16', 'ROUND_OF_32'];
  const rounds = [];

  for (let round = totalRounds; round >= 1; round--) {
    const matchCount = firstRoundCount / Math.pow(2, totalRounds - round);
    const roundName = roundNames[totalRounds - round] || `ROUND_${round}`;
    rounds.push({ round, roundName, matchCount });
  }

  // ponytail: create all matches for all rounds (empty slots for now)
  const roundMatches = {};
  for (const r of rounds) {
    roundMatches[r.round] = [];
    for (let pos = 0; pos < r.matchCount; pos++) {
      const match = await Match.create({
        tournamentId: data.tournamentId,
        type: data.matchType || 'SINGLE_ELIMINATION',
        player1Id: null,
        player2Id: null,
        scheduledTime: new Date(baseTime.getTime() + r.round * 3600000),
        status: 'SCHEDULED',
        bracketRound: r.round,
        weightClass: data.weightClass,
        stageName: r.roundName,
        bracketPosition: pos,
        hongScore: 0,
        chungScore: 0,
        scorePlayer1: 0,
        scorePlayer2: 0,
      });
      roundMatches[r.round].push(match);
    }
  }

  // ponytail: link matches (feeders -> next round)
  for (let round = 1; round < totalRounds; round++) {
    const currentRound = roundMatches[round];
    const nextRound = roundMatches[round + 1];
    for (let i = 0; i < currentRound.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      const slot = i % 2 === 0 ? 'PLAYER1' : 'PLAYER2';
      await currentRound[i].update({
        nextMatchId: nextRound[nextMatchIndex].id,
        nextMatchSlot: slot,
      });
    }
  }

  // ponytail: fill first round with players and BYEs
  const byesNeeded = firstRoundCount - players.length;
  for (let i = 0; i < roundMatches[1].length; i++) {
    const match = roundMatches[1][i];
    const pairIndex = i;

    if (pairIndex < pairs.length) {
      // ponytail: normal match with two players
      await match.update({
        player1Id: pairs[pairIndex].p1.id,
        player2Id: pairs[pairIndex].p2.id,
      });
      if (pairs[pairIndex].intraClub) {
        warnings.push({ matchId: match.id, reason: 'intra_club_match' });
      }
    } else if (pairIndex < pairs.length + byesNeeded) {
      // ponytail: BYE match — player gets automatic advancement
      const byePlayerIndex = players.length - (byesNeeded - (pairIndex - pairs.length));
      if (byePlayerIndex >= 0 && byePlayerIndex < players.length) {
        const byePlayer = players[byePlayerIndex];
        await match.update({
          player1Id: byePlayer.id,
          player2Id: null,
          status: 'FINISHED',
          winnerId: byePlayer.id,
          endReason: 'BYE',
          endTime: new Date(),
        });
        // ponytail: auto-advance BYE winner to next round
        if (match.nextMatchId) {
          const nextMatch = await Match.findByPk(match.nextMatchId);
          if (nextMatch) {
            if (match.nextMatchSlot === 'PLAYER1') {
              await nextMatch.update({ player1Id: byePlayer.id });
            } else {
              await nextMatch.update({ player2Id: byePlayer.id });
            }
          }
        }
        warnings.push({ matchId: match.id, reason: 'bye', playerName: byePlayer.name });
      }
    }
  }

  matches.push(...Object.values(roundMatches).flat());

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
