const bracketService = require('../Services/bracketService');
const { Match } = require('../Models');
const { successResponse } = require('../utils/httpResponse');

const getBracket = async (req, res, next) => {
  try {
    const tournamentId = req.params.id;
    const { weightClass, gender } = req.query;

    const tree = await bracketService.buildBracketTree(tournamentId, weightClass, gender);
    if (!tree) {
      return successResponse(res, {
        tournamentId: parseInt(tournamentId),
        weightClass,
        gender,
        currentStage: null,
        bracket: null,
      });
    }

    const allMatches = await Match.findAll({
      where: { tournamentId, weightClass },
    });
    const currentStage = bracketService.determineCurrentStage(allMatches);

    successResponse(res, {
      tournamentId: parseInt(tournamentId),
      weightClass,
      gender,
      currentStage,
      bracket: tree,
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
