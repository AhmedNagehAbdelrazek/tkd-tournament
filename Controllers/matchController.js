const matchService = require('../Services/matchService');
const matchmakingService = require('../Services/matchmakingService');
const { successResponse } = require('../utils/httpResponse');

const generate = async (req, res, next) => {
  try {
    const result = await matchmakingService.generateBracket(req.body);
    successResponse(res, result, 201);
  } catch (err) { next(err); }
};

const start = async (req, res, next) => {
  try {
    const result = await matchService.startMatch(req.params.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const pause = async (req, res, next) => {
  try {
    const result = await matchService.pauseMatch(req.params.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const resume = async (req, res, next) => {
  try {
    const result = await matchService.resumeMatch(req.params.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const endMatch = async (req, res, next) => {
  try {
    const result = await matchService.endMatch(req.params.id, req.body.winnerId);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const cancel = async (req, res, next) => {
  try {
    const role = req.user?.tkdRole || req.user?.globalRole || 'MAT_JUDGE';
    const result = await matchService.cancelMatch(req.params.id, role);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const match = await matchmakingService.getMatchDetail(req.params.id);
    successResponse(res, match);
  } catch (err) { next(err); }
};

module.exports = { generate, start, pause, resume, endMatch, cancel, getById };
