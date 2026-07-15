const matchService = require('../Services/matchService');
const matchmakingService = require('../Services/matchmakingService');
const scoringService = require('../Services/scoringService');
const { successResponse, paginatedResponse } = require('../utils/httpResponse');

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
    const result = await matchService.endMatch(req.params.id, req.body.winnerId, req.body.endReason);
    if (result.progression) {
      const io = req.app.get('io');
      if (io) {
        io.of('/live-matches').emit('BRACKET:UPDATED', {
          tournamentId: result.tournamentId,
          weightClass: result.weightClass,
          gender: result.gender,
        });
      }
    }
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

const list = async (req, res, next) => {
  try {
    const { data, meta } = await matchService.list(req.query);
    paginatedResponse(res, data, meta);
  } catch (err) { next(err); }
};

const schedule = async (req, res, next) => {
  try {
    const match = await matchService.schedule(req.body, req.user?.id);
    successResponse(res, match, 201);
  } catch (err) { next(err); }
};

const reschedule = async (req, res, next) => {
  try {
    const match = await matchService.reschedule(req.params.id, req.body.scheduledTime, req.user?.id);
    successResponse(res, match);
  } catch (err) { next(err); }
};

const walkover = async (req, res, next) => {
  try {
    const result = await matchService.walkover(req.params.id, req.body.winnerId, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const addPoint = async (req, res, next) => {
  try {
    const { playerId, points, roundNumber } = req.body;
    await scoringService.addPoint(req.params.id, playerId, points, roundNumber);
    const match = await matchmakingService.getMatchDetail(req.params.id);
    successResponse(res, match);
  } catch (err) { next(err); }
};

const removePoint = async (req, res, next) => {
  try {
    const { playerId, points, roundNumber } = req.body;
    await scoringService.removePoint(req.params.id, playerId, points, roundNumber);
    const match = await matchmakingService.getMatchDetail(req.params.id);
    successResponse(res, match);
  } catch (err) { next(err); }
};

const endRound = async (req, res, next) => {
  try {
    await scoringService.endRound(req.params.id);
    const match = await matchmakingService.getMatchDetail(req.params.id);
    successResponse(res, match);
  } catch (err) { next(err); }
};

module.exports = { generate, start, pause, resume, endMatch, cancel, getById, list, schedule, reschedule, walkover, addPoint, removePoint, endRound };
