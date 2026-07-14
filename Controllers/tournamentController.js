const tournamentService = require('../Services/tournamentService');
const { successResponse } = require('../utils/httpResponse');

const create = async (req, res, next) => {
  try {
    const result = await tournamentService.create(req.body);
    successResponse(res, result, 201);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const tournament = await tournamentService.getById(req.params.id);
    successResponse(res, tournament);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await tournamentService.list(req.query);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const result = await tournamentService.updateSettings(req.params.id, req.body);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const getExcludedPlayers = async (req, res, next) => {
  try {
    const excludedPlayers = await tournamentService.findExcludedPlayers(req.params.id);
    successResponse(res, { excludedPlayers, total: excludedPlayers.length });
  } catch (err) { next(err); }
};

module.exports = { create, getById, list, updateSettings, getExcludedPlayers };
