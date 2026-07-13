const { Match } = require('../Models');

async function validateRestPeriod(playerId, proposedTime, tournament) {
  const restMin = tournament.settings?.restBetweenMatchesMin || 15;

  const lastMatch = await Match.findOne({
    where: {
      [require('sequelize').Op.or]: [
        { player1Id: playerId },
        { player2Id: playerId },
      ],
      status: 'FINISHED',
    },
    order: [['endTime', 'DESC']],
  });

  if (!lastMatch || !lastMatch.endTime) {
    return { valid: true };
  }

  const lastEnd = new Date(lastMatch.endTime);
  const proposed = new Date(proposedTime);
  const diffMs = proposed.getTime() - lastEnd.getTime();
  const diffMin = diffMs / (1000 * 60);

  if (diffMin < restMin) {
    return {
      valid: false,
      requiredRestMin: restMin,
      availableRestMin: Math.round(diffMin * 10) / 10,
      lastMatchEnd: lastMatch.endTime,
    };
  }

  return { valid: true };
}

module.exports = { validateRestPeriod };
