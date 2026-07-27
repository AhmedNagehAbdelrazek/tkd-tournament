const playerService = require('../Services/playerService');
const { successResponse, paginatedResponse } = require('../utils/httpResponse');

const create = async (req, res, next) => {
  try {
    const players = await playerService.create(req.body, req.user?.id);
    successResponse(res, players, 201);
  } catch (err) { next(err); }
};

const bulkCreate = async (req, res, next) => {
  try {
    const result = await playerService.bulkCreate(req.body, req.user?.id);
    successResponse(res, result, 201);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const player = await playerService.getById(req.params.id);
    successResponse(res, player);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const player = await playerService.update(req.params.id, req.body, req.user?.id);
    successResponse(res, player);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await playerService.remove(req.params.id, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await playerService.list(req.query);
    paginatedResponse(res, result.data, result.totalCount, result.page, result.pageSize);
  } catch (err) { next(err); }
};

module.exports = { create, bulkCreate, getById, update, remove, list };
