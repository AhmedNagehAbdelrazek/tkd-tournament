const liveMatchService = require('../Services/liveMatchService');
const { successResponse } = require('../utils/httpResponse');

const getLiveMatch = async (req, res, next) => {
  try {
    const result = await liveMatchService.getLiveMatch(req.params.matchId);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const performAction = async (req, res, next) => {
  try {
    const result = await liveMatchService.performAction(req.params.matchId, req.body.action);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const addPoints = async (req, res, next) => {
  try {
    const result = await liveMatchService.addPoints(req.params.matchId, req.body.side, req.body.points);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const undoPoints = async (req, res, next) => {
  try {
    const result = await liveMatchService.undoPoints(req.params.matchId, req.body.side, req.body.points);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const addPenalty = async (req, res, next) => {
  try {
    const result = await liveMatchService.addPenalty(req.params.matchId, req.body.side);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const setInjury = async (req, res, next) => {
  try {
    const result = await liveMatchService.setInjury(req.params.matchId, req.body.side, req.body.isInjured);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const excludePlayer = async (req, res, next) => {
  try {
    const result = await liveMatchService.excludePlayer(req.params.matchId, req.body.side, req.body.reason);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const getSuggestions = async (req, res, next) => {
  try {
    const result = await liveMatchService.getSuggestions(req.params.matchId);
    successResponse(res, result);
  } catch (err) { next(err); }
};

module.exports = { getLiveMatch, performAction, addPoints, undoPoints, addPenalty, setInjury, excludePlayer, getSuggestions };
