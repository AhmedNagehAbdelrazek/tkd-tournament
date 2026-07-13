const playerService = require('../Services/playerService');
const { successResponse } = require('../utils/httpResponse');

const create = async (req, res, next) => {
  try {
    const player = await playerService.create(req.body);
    successResponse(res, player, 201);
  } catch (err) { next(err); }
};

const bulkCreate = async (req, res, next) => {
  try {
    const result = await playerService.bulkCreate(req.body);
    successResponse(res, result, 201);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await playerService.list(req.query);
    successResponse(res, result);
  } catch (err) { next(err); }
};

module.exports = { create, bulkCreate, list };
