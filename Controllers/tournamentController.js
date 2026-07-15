const tournamentService = require('../Services/tournamentService');
const { successResponse, paginatedResponse } = require('../utils/httpResponse');

const create = async (req, res, next) => {
  try {
    const result = await tournamentService.create(req.body, req.user?.id);
    successResponse(res, result, 201);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const tournament = await tournamentService.getById(req.params.id);
    successResponse(res, tournament);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const tournament = await tournamentService.update(req.params.id, req.body, req.user?.id);
    successResponse(res, tournament);
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const result = await tournamentService.updateSettings(req.params.id, req.body, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const markComplete = async (req, res, next) => {
  try {
    const tournament = await tournamentService.markComplete(req.params.id, req.user?.id);
    successResponse(res, tournament);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await tournamentService.remove(req.params.id, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const { data, meta } = await tournamentService.list(req.query);
    paginatedResponse(res, data, meta);
  } catch (err) { next(err); }
};

const getExcludedPlayers = async (req, res, next) => {
  try {
    const excludedPlayers = await tournamentService.findExcludedPlayers(req.params.id);
    successResponse(res, { excludedPlayers, total: excludedPlayers.length });
  } catch (err) { next(err); }
};

const getOverview = async (req, res, next) => {
  try {
    const overview = await tournamentService.getTournamentOverview(req.params.id);
    successResponse(res, overview);
  } catch (err) { next(err); }
};

const getTournamentList = async (req, res, next) => {
  try {
    const { data, meta } = await tournamentService.getTournamentList(req.query);
    paginatedResponse(res, data, meta);
  } catch (err) { next(err); }
};

module.exports = { create, getById, update, updateSettings, markComplete, remove, list, getExcludedPlayers, getOverview, getTournamentList };
