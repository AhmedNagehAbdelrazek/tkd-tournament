const bracketService = require('../Services/bracketService');
const { Match } = require('../Models');
const { successResponse } = require('../utils/httpResponse');

const getBracket = async (req, res, next) => {
  try {
    const tournamentId = req.params.id;
    const { weightClass, gender } = req.query;

    // ponytail: if no params, return all brackets in one shot
    if (!weightClass && !gender) {
      const result = await bracketService.buildAllBrackets(tournamentId);
      return successResponse(res, result);
    }

    const result = await bracketService.buildBracketTree(tournamentId, weightClass, gender);
    if (!result) {
      return successResponse(res, {
        tournamentId: parseInt(tournamentId),
        weightClass,
        gender,
        currentRound: null,
        totalRounds: 0,
        bracket: null,
      });
    }

    const allMatches = await Match.findAll({ where: { tournamentId } });
    const currentRound = bracketService.determineCurrentRound(allMatches);

    successResponse(res, {
      tournamentId: parseInt(tournamentId),
      weightClass,
      gender,
      currentRound,
      totalRounds: result.totalRounds,
      bracket: result.bracket,
    });
  } catch (err) { next(err); }
};

const overrideMatchSlot = async (req, res, next) => {
  try {
    const result = await bracketService.overrideNextMatchSlot(req.body.matchId, req.body.playerId);
    successResponse(res, result);
  } catch (err) { next(err); }
};

module.exports = { getBracket, overrideMatchSlot };
