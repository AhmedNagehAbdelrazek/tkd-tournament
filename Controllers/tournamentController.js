const tournamentService = require('../Services/tournamentService');
const { successResponse } = require('../utils/httpResponse');

const create = async (req, res, next) => {
  try {
    const tournament = await tournamentService.create(req.body);
    successResponse(res, tournament, 201);
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

module.exports = { create, getById, list };
